const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

class LegendOfArcadia {
    headers(authorization) {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Authorization": `Basic ${authorization}`,
            "Origin": "https://loahero.legendofarcadia.io",
            "Priority": "u=1, i",
            "Referer": "https://loahero.legendofarcadia.io/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126", "Microsoft Edge WebView2";v="126"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async login(queryString, proxy) {
        const url = "https://loahero.legendofarcadia.io/Mini/Login";
        const headers = {
            "Authorization": `Telegram ${queryString}`,
            "Content-Type": "application/json"
        };
        
        const payload = {
            "platform": "mini",
            "channel": "telegram",
            "data": {
                "initData": queryString,
                "initDataUnsafe": this.parseQueryString(queryString),
                "version": "7.6",
                "platform": "android",
                "colorScheme": "light",
                "themeParams": {
                    "bg_color": "#ffffff",
                    "button_color": "#3390ec",
                    "button_text_color": "#ffffff",
                    "hint_color": "#707579",
                    "link_color": "#00488f",
                    "secondary_bg_color": "#f4f4f5",
                    "text_color": "#000000",
                    "header_bg_color": "#ffffff",
                    "accent_text_color": "#3390ec",
                    "section_bg_color": "#ffffff",
                    "section_header_text_color": "#3390ec",
                    "subtitle_text_color": "#707579",
                    "destructive_text_color": "#df3f40"
                },
                "isExpanded": true,
                "viewportHeight": 639,
                "viewportStableHeight": 639,
                "isClosingConfirmationEnabled": false,
                "isVerticalSwipesEnabled": true,
                "headerColor": "#ffffff",
                "backgroundColor": "#ffffff",
                "BackButton": { "isVisible": false },
                "MainButton": {
                    "text": "CONTINUE",
                    "color": "#3390ec",
                    "textColor": "#ffffff",
                    "isVisible": false,
                    "isProgressVisible": false,
                    "isActive": true
                },
                "SettingsButton": { "isVisible": false },
                "HapticFeedback": {},
                "CloudStorage": {},
                "BiometricManager": {
                    "isInited": false,
                    "isBiometricAvailable": false,
                    "biometricType": "unknown",
                    "isAccessRequested": false,
                    "isAccessGranted": false,
                    "isBiometricTokenSaved": false,
                    "deviceId": ""
                }
            }
        };

        const agent = new HttpsProxyAgent(proxy);

        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: agent });
            if (response.data.code === 0) {
                const token = response.data.data.token;
                this.log(`Đăng nhập thành công!`.green);
                return token;
            } else {
                this.log('Lỗi: Không thể đăng nhập.'.red);
            }
        } catch (error) {
            this.log('Lỗi khi gọi API đăng nhập.'.red);
            console.error(error.message.red);
        }
        return null;
    }

    async rescueHero(authorization, heroId, proxy) {
        const url = "https://loahero-api.legendofarcadia.io/Mini/RescueHero";
        const headers = this.headers(authorization);
        const payload = { HeroId: heroId };
        const agent = new HttpsProxyAgent(proxy);

        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: agent });
            const heroInfo = response.data.data?.HeroInfo;
            if (heroInfo) {
                this.log(`Hồi phục HP thành công cho Hero ID: ${heroId}. HP hiện tại: ${heroInfo.Stamina.toString().white}`.green);
            } else {
                this.log(`${'Lỗi: Không thể hồi phục HP cho Hero'.red}`);
            }
        } catch (error) {
            this.log(`${'Lỗi khi gọi API cứu trợ Hero'.red}`);
            console.error(error.message.red);
        }
    }

    async heartbeat(authorization, state, attackCount, proxy) {
        const url = "https://loahero-api.legendofarcadia.io/Mini/Heartbeat";
        const headers = this.headers(authorization);
        const payload = { State: state, AttackCount: attackCount };
        const agent = new HttpsProxyAgent(proxy);
    
        try {
            let response = await axios.post(url, payload, { headers, httpsAgent: agent });
            let userBaseData = response.data.data?.UserBaseData;
            if (userBaseData) {
                let balance = userBaseData.Coin;
                let Energy = userBaseData.Energy;
                this.log(`Tap thành công với AttackCount: ${attackCount.toString().white} | Balance: ${balance.toString().white} | Energy: ${Energy.toString().white}`.green);
                while (Energy > 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); 
                    response = await axios.post(url, payload, { headers, httpsAgent: agent });
                    userBaseData = response.data.data?.UserBaseData;
                    Energy = userBaseData?.Energy;
                    balance = userBaseData?.Coin;
    
                    if (Energy && balance !== undefined) {
                        this.log(`Tiếp tục tap | Balance: ${balance.toString().yellow} | Energy: ${Energy.toString().yellow}`.white);
                    }
    
                    if (Energy <= 10) {
                        this.log(`Năng lượng thấp, dừng tap.`.red);
                        break;
                    }
                }
            } else {
                this.log(`Tap thành công với AttackCount: ${attackCount.toString().white}`.green);
            }
        } catch (error) {
            this.log(`${'Lỗi khi gọi API Heartbeat'.red}`);
            console.error(error.message.red);
        }
    }

    async syncMissionAndUnlockHeroes(authorization, state, proxy) {
        const syncMissionUrl = "https://loahero-api.legendofarcadia.io/Mini/SyncMissionHB";
        const heroUnlockUrl = "https://loahero-api.legendofarcadia.io/Mini/HeroUnlock";
        const heroLvUpUrl = "https://loahero-api.legendofarcadia.io/Mini/HeroLvUp";
        const headers = this.headers(authorization);
        const payload = { State: state, AttackCount: 0 };
        const agent = new HttpsProxyAgent(proxy);

        try {
            const response = await axios.post(syncMissionUrl, payload, { headers, httpsAgent: agent });
            const heroes = response.data.data?.UserData?.Hero?.Heroes;

            if (heroes) {
                const existingHeroIds = Object.keys(heroes).map(id => parseInt(id));
                const allHeroIds = Array.from({ length: 16 }, (_, i) => i + 1); 
                const unlockHeroIds = allHeroIds.filter(id => !existingHeroIds.includes(id));

                for (const heroId of unlockHeroIds) {
                    const unlockPayload = { HeroId: heroId };
                    try {
                        const unlockResponse = await axios.post(heroUnlockUrl, unlockPayload, { headers, httpsAgent: agent });
                        if (unlockResponse.data.code === 0) {
                            this.log(`Mở khóa Hero ID: ${heroId.toString().white} thành công!`.green);
                        } else {
                            this.log(`Không thể mở khóa Hero ID: ${heroId.toString().red}.`.red);
                        }
                    } catch (unlockError) {
                        this.log(`Lỗi khi mở khóa Hero ID: ${heroId}.`.red);
                        console.error(unlockError.message.red);
                    }
                }

                for (const heroId of existingHeroIds) {
                    const lvUpPayload = { HeroId: heroId, AddLv: 10 };
                    while (true) {
                        try {
                            const lvUpResponse = await axios.post(heroLvUpUrl, lvUpPayload, { headers, httpsAgent: agent });
                            if (lvUpResponse.data.code === 0) {
                                this.log(`Tăng cấp Hero ID: ${heroId.toString().white} lên thêm 10 cấp!`.green);
                            } else {
                                this.log(`Lỗi khi tăng cấp Hero ID: ${heroId.toString().red}. Dừng quá trình tăng cấp.`.red);
                                break;
                            }
                        } catch (lvUpError) {
                            this.log(`Lỗi khi tăng cấp Hero ID: ${heroId}. Dừng quá trình tăng cấp.`.red);
                            console.error(lvUpError.message.red);
                            break;
                        }
                    }
                }
            } else {
                this.log(`${'Lỗi: Không tìm thấy dữ liệu Hero'.red}`);
            }
        } catch (error) {
            this.log(`${'Lỗi khi gọi API đồng bộ nhiệm vụ và mở khóa Hero'.red}`);
            console.error(error.message.red);
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            console.error(`Lỗi khi kiểm tra IP của proxy: ${error.message}`.red);
            return null;
        }
    }

    async getWorldBossState(authorization, accountNumber, hoinangcap, proxy) {
        const url = "https://loahero-api.legendofarcadia.io/Mini/GetWorldBossState";
        const headers = this.headers(authorization);
        const agent = new HttpsProxyAgent(proxy);

        try {
            const proxyIP = await this.checkProxyIP(proxy);
            if (!proxyIP) {
                this.log(`Bỏ qua tài khoản ${accountNumber} do lỗi proxy.`.yellow);
                return; 
            }

            const response = await axios.get(url, { headers, httpsAgent: agent });
            const userData = response.data.data?.UserBaseData;
            let bossState = response.data.data?.BossState;
            let chestState = response.data.data?.ChestState;
            const state = response.data.data?.State;

            if (userData) {
                console.log(`========== Tài khoản ${accountNumber} | ${userData.Name.green} | IP: ${proxyIP.white} ==========`);
                this.log(`Point: ${userData.Point.toString().white}`.green);
                this.log(`Coin: ${userData.Coin.toString().white}`.green);
                this.log(`Energy: ${userData.Energy.toString().white}`.green);

                const playerStates = response.data.data?.PlayerStates;
                for (const player of playerStates) {
                    if (player.CurrentHp === 0) {
                        await this.rescueHero(authorization, player.HeroId, proxy);
                    }
                }

                if (userData.Energy > 0) {
                    if (bossState) {
                        const attackCount = Math.floor(userData.Energy / bossState.Click2Coin);
                        if (attackCount > 0) {
                            await this.heartbeat(authorization, state, attackCount, proxy);
                        }
                    } else if (chestState) {
                        const attackCount = Math.floor(userData.Energy / chestState.Click2Coin);
                        if (attackCount > 0) {
                            await this.heartbeat(authorization, state, attackCount, proxy);
                        }
                    } else {
                        this.log(`${'Không tìm thấy dữ liệu.'.red}`);
                    }
                }

                if (hoinangcap) {
                    await this.syncMissionAndUnlockHeroes(authorization, state, proxy);
                }

            } else {
                this.log(`${'Lỗi: Không tìm thấy UserBaseData'.red}`);
            }
        } catch (error) {
            this.log(`${'Lỗi khi lấy thông tin'.red}`);
            console.error(error.message.red);
        }
    }

    parseQueryString(queryString) {
        return queryString.split('&').reduce((acc, param) => {
            const [key, value] = param.split('=');
            acc[key] = decodeURIComponent(value.replace(/\+/g, ' '));
            return acc;
        }, {});
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            process.stdout.write(`[*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            readline.cursorTo(process.stdout, 0);
        }
        console.log('');
    }

    async askQuestion(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(question, answer => {
            rl.close();
            resolve(answer);
        }));
    }

    async main() {
        const nangcap = await this.askQuestion('Bạn có muốn mở khóa và nâng cấp hero không? (y/n): ');
        const hoinangcap = nangcap.toLowerCase() === 'y';
        while (true) {
            const dataFile = path.join(__dirname, 'data.txt');
            const proxyFile = path.join(__dirname, 'proxy.txt');
            const lines = fs.readFileSync(dataFile, 'utf8').split('\n').filter(line => line.trim());
            const proxies = fs.readFileSync(proxyFile, 'utf8').split('\n').filter(line => line.trim());

            for (let i = 0; i < lines.length; i++) {
                const queryString = lines[i].trim();
                const proxy = proxies[i].trim();
                if (queryString && proxy) {
                    const token = await this.login(queryString, proxy);
                    if (token) {
                        await this.getWorldBossState(token, i + 1, hoinangcap, proxy);
                        await this.waitWithCountdown(1);
                    }
                }
            }

            await this.waitWithCountdown(300);
        }
    }
}

if (require.main === module) {
    const loa = new LegendOfArcadia();
    loa.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}