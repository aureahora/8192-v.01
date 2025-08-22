// cloudSaves.js — Модуль для взаимодействия с облачными сохранениями GamePush

// Список ключей для сохранения
const PLAYER_FIELDS = ['best', 'playscore', 'maxtile', 'games', 'glow', 'music'];

export const CloudSaves = {
    // Ждём появления SDK GamePush (до 20 сек, с интервалом 100 мс)
    async waitForSDK(timeoutMs = 20000, intervalMs = 100) {
        const started = Date.now();
        while (!window.gamePushSDK) {
            if (Date.now() - started > timeoutMs) {
                console.error('[CloudSaves] GamePush SDK не инициализирован за отведённое время!');
                throw new Error('GamePush SDK timeout');
            }
            await new Promise(res => setTimeout(res, intervalMs));
        }
        return window.gamePushSDK;
    },

    // Загрузка ВСЕХ облачных переменных игрока
    async loadAll() {
        console.log('[CloudSaves] Старт загрузки облачных сохранений...');
        try {
            const gp = await CloudSaves.waitForSDK();
            // Проверяем наличие player API
            if (!gp.player) throw new Error('GamePush player API недоступен!');
            let result = {};
            for (const key of PLAYER_FIELDS) {
                try {
                    const value = gp.player.get(key);
                    result[key] = value;
                    console.log(`[CloudSaves] Загружено поле "${key}":`, value);
                } catch (err) {
                    console.warn(`[CloudSaves] Не удалось загрузить поле "${key}":`, err);
                    result[key] = null;
                }
            }
            return result;
        } catch (e) {
            console.error('[CloudSaves] Ошибка загрузки облака:', e);
            throw e;
        }
    },

    // Сохранить одно поле
    async save(key, value) {
        console.log(`[CloudSaves] Сохраняем поле "${key}" в облако... Значение:`, value);
        try {
            const gp = await CloudSaves.waitForSDK();
            if (!gp.player) throw new Error('GamePush player API недоступен!');
            gp.player.set(key, value);
            await gp.player.sync();
            console.log(`[CloudSaves] Сохранено поле "${key}" успешно!`);
        } catch (e) {
            console.error(`[CloudSaves] Ошибка сохранения поля "${key}" в облако:`, e);
            throw e;
        }
    },

    // Сохранить все поля разом
    async saveAll(data) {
        console.log('[CloudSaves] Начало сохранения всех полей игрока в облако...', data);
        try {
            const gp = await CloudSaves.waitForSDK();
            if (!gp.player) throw new Error('GamePush player API недоступен!');
            for (const key of PLAYER_FIELDS) {
                if (typeof data[key] !== 'undefined') {
                    gp.player.set(key, data[key]);
                    console.log(`[CloudSaves] Установлено поле "${key}" =`, data[key]);
                }
            }
            await gp.player.sync();
            console.log('[CloudSaves] Все поля успешно сохранены в облако!');
        } catch (e) {
            console.error('[CloudSaves] Ошибка сохранения всех полей:', e);
            throw e;
        }
    }
};