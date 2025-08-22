// Модуль для облачных сохранений через GamePush
export const CloudSaves = {
    // Загрузить все нужные переменные
    async loadAll() {
        if (!window.gamePushSDK) {
            throw new Error('GamePush SDK not initialized');
        }
        const gp = window.gamePushSDK;
        // Получить все значения из облака
        const saves = await gp.player.save.getAll();
        return {
            best: saves.best ?? 0,
            playscore: saves.playscore ?? 0,
            maxtile: saves.maxtile ?? 0,
            games: saves.games ?? 0,
            glow: saves.glow ?? 0,
            music: saves.music ?? 0,
        };
    },

    // Сохранить одну переменную
    async save(key, value) {
        if (!window.gamePushSDK) return;
        await window.gamePushSDK.player.save.set(key, value);
    },

    // Сохранить все переменные
    async saveAll({ best, playscore, maxtile, games, glow, music }) {
        if (!window.gamePushSDK) return;
        const gp = window.gamePushSDK;
        await Promise.all([
            gp.player.save.set('best', best),
            gp.player.save.set('playscore', playscore),
            gp.player.save.set('maxtile', maxtile),
            gp.player.save.set('games', games),
            gp.player.save.set('glow', glow),
            gp.player.save.set('music', music),
        ]);
    }
};