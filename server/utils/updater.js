'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');
const archiver = require('archiver-promise');
const moment = require('moment');
const chalk = require('chalk');
const config = require('../../config.json');

const logHeaders = {
    success: chalk.bgGreen(' DONE '),
    info: chalk.bgBlue(' INFO '),
    warning: chalk.bgYellow(' WARN '),
    error: chalk.bgRed(' ERR ')
}

/**
 * @brief Verifie si le fichier locker est present
 * @param {*} game 
 */
function isGameLocked(game) {
    return fs.existsSync(path.normalize(path.join(config.base, game, config.lock)));
}

/**
 * @brief Creer un fichier locker permettant d'indiquer aux autres actions qu'une action est en encore
 * @param {*} game 
 */
function lockGame(game) {
    console.log(logHeaders.info, 'Locking game...');
    fs.writeFileSync(path.normalize(path.join(config.base, game, config.lock)));
}

/**
 * @brief Supprime les fichier locker
 * @param {*} game 
 */
function unlockGame(game) {
    console.log(logHeaders.info, 'Unlocking game...');
    fs.unlinkSync(path.normalize(path.join(config.base, game, config.lock)));
}

/**
 * @brief Met a jour le fichier inventaire
 * Verifie si le fichier present dans le repertoire a le meme hash que l'ancienne sauvegarde
 * Supprime les fichiers detecter comme obsolete dans le fichier inventaire
 * @param {*} game 
 * @param {*} element 
 * @param {*} files 
 * @param {*} inventory 
 */
function updateInventory(game, element, files, inventory) {
    let gamePath = path.normalize(path.join(config.base, game, config.game.workspace));

    let src = path.normalize(element)
    let stat = {};
    let key = src.replace(gamePath, "").replace(/\\/g, '/');
    let data = fs.readFileSync(src);
    let hash = crypto.createHash('sha256').update(data).digest('hex');
    stat["checksum"] = hash;
    if (!(key in inventory)) {
        inventory[key] = null;
    }
    if (fileNeedsUpdate(stat, inventory[key])) {
        inventory[key] = stat;
        files.push(element);
    }
}

function fileNeedsUpdate(newStat, oldStat) {
    return !oldStat || !oldStat.checksum || newStat.checksum !== oldStat.checksum
}

/**
 * @brief Process de compression des fichiers
 * Le fichiers compresser sont au format ZIP
 * @param {*} game 
 * @param {*} files 
 */
async function compress(game, files) {
    let start = moment(Date.now());
    console.log(logHeaders.info, 'Compressing files...');

    let gamePath = path.normalize(path.join(config.base, game, config.game.workspace))
    let updatePath = path.normalize(path.join(config.base, game, config.update.workspace))

    for (const file of files) {
        let src = path.normalize(file);
        let fileName = path.parse(src).base;
        let dst = path.join(updatePath, `${src.replace(gamePath, '')}.zip`);

        let archive = archiver('zip', { zlib: { level: config.compression.level } });
        archive.append(fs.createReadStream(src), { name: fileName });
        archive.on('entry', () => {console.log(logHeaders.info, `Zipping ${fileName}...`)});
        archive.on('finish', () => {console.log(logHeaders.success, `Zipped ${fileName}!`)});
        archive.on('warning', error => {console.log(logHeaders.error, error)});
        archive.pipe(fs.createWriteStream(dst));

        try {
            await archive.finalize();
        } catch (error) {
            console.log(logHeaders.error, "Compression has failed.", error);
        }
    };

    let finish = moment(Date.now());
    console.log(logHeaders.success, `Files compressed in ${finish.diff(start, 'seconds', true)}s.`);
}

/**
 * @brief Supprimes les fichiers obsolete
 * Verification entre le fichier inventaire et les fichiers present sur le disque
 * Met a jour le fichier inventaire en supprimant les fichiers obsolete du fichier
 * @param {*} game 
 * @param {*} inventory 
 */
function purgeObsoleteFiles(game, inventory) {
    let start = moment(Date.now());
    console.log(logHeaders.info, 'Locating obsolete files...');

    let gamePath = path.normalize(path.join(config.base, game, config.game.workspace));
    let updatePath = path.normalize(path.join(config.base, game, config.update.workspace));
    let obsoleteFiles = [];

    Object.keys(inventory).forEach(key => {
        let originalFile = path.join(gamePath, key);

        if (!fs.existsSync(originalFile)) {
            let compressedFile = path.join(updatePath, key + '.zip');

            if (fs.existsSync(compressedFile)) {
                fs.unlinkSync(compressedFile);
                obsoleteFiles.push(key);
            }
        }
    });

    console.log(logHeaders.info, `${obsoleteFiles.length} files need to be deleted.`);

    obsoleteFiles.forEach(file => {
        delete inventory[file];
    });

    let finish = moment(Date.now());
    console.log(logHeaders.success, `Obsolete files purged in ${finish.diff(start, 'seconds', true)}s.`);
}

/**
 * @brief Process de mise a jour du fichier inventaire
 * Chaque fichier present dans le repertoire de l'application va etre comparer avec le fichier inventaire
 * @param {*} game 
 */
function getUpdatableFiles(game) {
    let start = moment(Date.now());
    console.log(logHeaders.info, 'Locating updatable files...');

    let files = [];
    let gamePath = path.normalize(path.join(config.base, game, config.game.workspace));
    let updatePath = path.normalize(path.join(config.base, game, config.update.workspace));
    let inventoryPath = path.normalize(path.join(config.base, game, config.meta.workspace, config.meta.inventory));
    let inventory = {};

    try {
        inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    } catch (error) {
        fs.writeFileSync(inventoryPath, JSON.stringify({}));
    }

    glob.sync(path.join(gamePath, '**', '*'))
        .forEach(item => {
            if (fs.lstatSync(item).isDirectory()) {
                let dir = path.normalize(item).replace(gamePath, updatePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
            } else {
                updateInventory(game, item, files, inventory);
            }
        });

    let finish = moment(Date.now());
    console.log(logHeaders.success, `Updatable files located in ${finish.diff(start, 'seconds', true)}s.`);

    purgeObsoleteFiles(game, inventory);
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory));

    return files;
}

module.exports = async function (game) {
    let processStart = moment(Date.now());

    if (isGameLocked(game)) {
        console.log(logHeaders.error, `The game ${game} is locked.`);
        return true
    }

    lockGame(game);

    let files = getUpdatableFiles(game);
    if (files.length > 0) {
        console.log(logHeaders.info, `${files.length} files need to be updated.`);
        await compress(game, files);
    }

    unlockGame(game);

    let processEnd = moment(Date.now());
    console.log(logHeaders.success, `Process finished in ${processEnd.diff(processStart, 'seconds', true)}s`);
}