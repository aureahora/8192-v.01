/**
 * CloudSaves — модуль для работы с облачными сохранениями через GamePush SDK.
 * Все методы ждут готовности SDK, логируют действия и ошибки.
 */

export const CloudSaves = {
    // Загрузка всех полей
    async loadAll() {
        let gp = window.gamePushSDK;
        if (!gp) {
            console.error('[CloudSaves] GamePush SDK не инициализирован!');
            return null;
        }
        try {
            const best = gp.player.get('best');
            const playscore = gp.player.get('playscore');
            const maxtile = gp.player.get('maxtile');
            const games = gp.player.get('games');
            const glow = gp.player.get('glow');
            const music = gp.player.get('music');
            const progressStr = gp.player.get('progress');
            let progress = null;
            try {
                progress = progressStr ? JSON.parse(progressStr) : null;
            } catch (e) {
                console.warn('[CloudSaves] Не удалось распарсить прогресс:', e);
                progress = null;
            }
            console.log('[CloudSaves] Данные игрока загружены из облака:', { best, playscore, maxtile, games, glow, music, progress });
            return { best, playscore, maxtile, games, glow, music, progress };
        } catch (e) {
            console.error('[CloudSaves] Ошибка загрузки данных игрока из облака:', e);
            return null;
        }
    },

    // Сохраняет одну переменную (ключ: value)
    async save(key, value) {
        let gp = window.gamePushSDK;
        if (!gp) {
            console.error('[CloudSaves] GamePush SDK не инициализирован!');
            return;
        }
        try {
            gp.player.set(key, value);
            await gp.player.sync();
            console.log(`[CloudSaves] Поле "${key}" сохранено в облако. Значение:`, value);
        } catch (e) {
            console.error(`[CloudSaves] Ошибка сохранения поля "${key}" в облако:`, e);
        }
    },

    // Сохраняет все основные переменные
    async saveAll(obj) {
        let gp = window.gamePushSDK;
        if (!gp) {
            console.error('[CloudSaves] GamePush SDK не инициализирован!');
            return;
        }
        try {
            for (const [key, value] of Object.entries(obj)) {
                gp.player.set(key, value);
            }
            await gp.player.sync();
            console.log('[CloudSaves] Все поля игрока сохранены в облако:', obj);
        } catch (e) {
            console.error('[CloudSaves] Ошибка сохранения всех полей игрока:', e);
        }
    },

    // Специальный метод для сохранения прогресса (JSON-строка)
    async saveProgress(progressObj) {
        let gp = window.gamePushSDK;
        if (!gp) {
            console.error('[CloudSaves] GamePush SDK не инициализирован!');
            return;
        }
        try {
            const progressStr = JSON.stringify(progressObj);
            gp.player.set('progress', progressStr);
            await gp.player.sync();
            console.log('[CloudSaves] Прогресс игры сохранён в облако:', progressObj);
        } catch (e) {
            console.error('[CloudSaves] Ошибка сохранения прогресса в облако:', e);
        }
    }
};