// --- CloudSaves интеграция для сохранения прогресса игры ---
export const CloudSaves = {
    /**
     * Сохраняет все переданные значения в облако
     * @param {Object} data - Объект с ключами и значениями для сохранения
     * @returns {Promise}
     */
    saveAll: async function(data) {
        console.log("[CloudSaves] Сохранение всех данных в облако:", data);
        
        if (!window.gamePushSDK) {
            console.warn("[CloudSaves] GamePush SDK не найден, используем localStorage");
            // Fallback на localStorage если SDK не доступен
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, JSON.stringify(data[key]));
            });
            return Promise.resolve();
        }

        try {
            // Обновляем все поля в SDK
            Object.keys(data).forEach(key => {
                window.gamePushSDK.player.set(key, data[key]);
            });
            // Синхронизируем с сервером
            await window.gamePushSDK.player.sync();
            console.log("[CloudSaves] Все данные успешно сохранены в облако");
            return Promise.resolve();
        } catch (error) {
            console.error("[CloudSaves] Ошибка при сохранении данных в облако:", error);
            return Promise.reject(error);
        }
    },

    /**
     * Сохраняет одно значение в облако
     * @param {string} key - Ключ для сохранения
     * @param {any} value - Значение для сохранения
     * @returns {Promise}
     */
    save: async function(key, value) {
        console.log(`[CloudSaves] Сохранение '${key}' в облако:`, value);
        
        if (!window.gamePushSDK) {
            console.warn(`[CloudSaves] GamePush SDK не найден, используем localStorage для '${key}'`);
            localStorage.setItem(key, JSON.stringify(value));
            return Promise.resolve();
        }

        try {
            window.gamePushSDK.player.set(key, value);
            await window.gamePushSDK.player.sync();
            console.log(`[CloudSaves] '${key}' успешно сохранен в облако`);
            return Promise.resolve();
        } catch (error) {
            console.error(`[CloudSaves] Ошибка при сохранении '${key}' в облако:`, error);
            return Promise.reject(error);
        }
    },

    /**
     * Загружает все сохраненные значения из облака
     * @returns {Promise<Object>} Объект с сохраненными данными
     */
    loadAll: async function() {
        console.log("[CloudSaves] Загрузка всех данных из облака");
        
        if (!window.gamePushSDK) {
            console.warn("[CloudSaves] GamePush SDK не найден, используем localStorage");
            // Собираем все известные ключи из localStorage
            const keys = ['best', 'playscore', 'maxtile', 'games', 'glow', 'music', 'progress'];
            const result = {};
            keys.forEach(key => {
                const item = localStorage.getItem(key);
                if (item !== null) {
                    try {
                        result[key] = JSON.parse(item);
                    } catch (e) {
                        result[key] = item;
                    }
                }
            });
            return Promise.resolve(result);
        }

        try {
            // Для GamePush данные уже загружены при инициализации SDK
            const result = {
                best: window.gamePushSDK.player.get('best') || 0,
                playscore: window.gamePushSDK.player.get('playscore') || 0,
                maxtile: window.gamePushSDK.player.get('maxtile') || 0,
                games: window.gamePushSDK.player.get('games') || 0,
                glow: window.gamePushSDK.player.get('glow') ?? 0,
                music: window.gamePushSDK.player.get('music') ?? 0,
                progress: window.gamePushSDK.player.get('progress') || null
            };
            console.log("[CloudSaves] Данные успешно загружены из облака:", result);
            return Promise.resolve(result);
        } catch (error) {
            console.error("[CloudSaves] Ошибка при загрузке данных из облака:", error);
            return Promise.reject(error);
        }
    },

    /**
     * Сохраняет объект прогресса игры в облако как JSON-строку
     * @param {Object} progressObj - Объект с данными о прогрессе игры
     * @returns {Promise}
     */
    saveProgress: async function(progressObj) {
        if (!progressObj) {
            console.error("[CloudSaves] Попытка сохранить пустой прогресс");
            return Promise.reject(new Error("Пустой объект прогресса"));
        }

        console.log("[CloudSaves] Сохранение прогресса игры в облако:", progressObj);
        
        try {
            // Преобразуем объект прогресса в JSON-строку
            const progressStr = JSON.stringify(progressObj);
            
            // Сохраняем в облако с ключом 'progress'
            return this.save('progress', progressStr);
        } catch (error) {
            console.error("[CloudSaves] Ошибка при сохранении прогресса в облако:", error);
            return Promise.reject(error);
        }
    },

    /**
     * Загружает прогресс игры из облака
     * @returns {Promise<Object|null>} Объект прогресса или null, если прогресс не найден
     */
    loadProgress: async function() {
        console.log("[CloudSaves] Загрузка прогресса игры из облака");
        
        try {
            const data = await this.loadAll();
            if (!data.progress) {
                console.log("[CloudSaves] Прогресс игры не найден в облаке");
                return null;
            }

            let progressObj;
            try {
                // Пробуем распарсить JSON-строку
                if (typeof data.progress === 'string') {
                    progressObj = JSON.parse(data.progress);
                } else {
                    progressObj = data.progress;
                }
            } catch (e) {
                console.error("[CloudSaves] Ошибка парсинга прогресса:", e);
                return null;
            }

            console.log("[CloudSaves] Прогресс игры успешно загружен:", progressObj);
            return progressObj;
        } catch (error) {
            console.error("[CloudSaves] Ошибка при загрузке прогресса из облака:", error);
            return null;
        }
    }
};