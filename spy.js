/**
 * SPY.JS
 * 包含：旧版视奸(V19)、新版视奸(V25)、地图交互、天气、API生成逻辑
 */

// ==========================================
// 1. 全局变量定义
// ==========================================

// 地图状态 (用于 V19/V20 旧版拖拽)
let spyMapState = {
    isDragging: false,
    isPinching: false,
    startX: 0, startY: 0,
    currentX: 0, currentY: 0,
    lastX: 0, lastY: 0,
    scale: 1, startDist: 0
};

// 来源标记 (用于返回逻辑)
window.spyScreenOrigin = 'settings';

// 全局状态 (用于 V25 新版地图)
window.spyState = {
    scale: 1,
    currentX: 0, currentY: 0,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    isDragging: false,
    isAddingMode: false,
    friendId: null
};

// 当前情侣ID (跨功能通用)
window.currentLoversFriendId = null;


// ==========================================
// 2. 核心入口与返回逻辑
// ==========================================

/**
 * 【从设置打开】视奸/动态页面
 * 修复：确保 ID 正确传递，并标记来源
 */
window.openSpyFromSettings = function() {
    console.log("正在尝试打开TA的动态...");

    if (!currentChatFriendId) {
        alert("错误：无法获取当前好友信息，请先进入聊天窗口。");
        return;
    }

    // 核心：同步ID
    currentLoversFriendId = currentChatFriendId;
    window.spyScreenOrigin = 'settings';

    // 优先尝试使用新版入口 (如果存在)，否则回退到旧版
    if (typeof window.forceOpenSpyMap === 'function') {
        // 使用 V25 黑白版入口
        window.forceOpenSpyMap();
    } else if (typeof openLoversSpyScreen === 'function') {
        // 使用 V19 彩色版入口
        openLoversSpyScreen();
    } else {
        alert("错误：找不到视奸页面函数，请检查代码完整性。");
    }
};

/**
 * 【通用返回】视奸页面返回函数
 */
window.backFromSpyScreen = function() {
    if (window.spyScreenOrigin === 'settings') {
        setActivePage('chatSettingsScreen');
    } else {
        // 兼容：如果存在旧的详情页函数则调用
        if (typeof backToLoversDetail === 'function') {
            backToLoversDetail();
        } else {
            // 兜底：如果没有详情页，就去主页
            if(typeof goHome === 'function') goHome();
        }
    }
};

// 新版专用返回函数
window.forceBackFromSpy = function() {
    if(typeof setActivePage === 'function') setActivePage('chatSettingsScreen');
    else location.reload();
};


// ==========================================
// 3. 旧版视奸逻辑 (V19 彩色图标版)
// ==========================================

/**
 * 打开视奸页面 (旧版渲染逻辑)
 */
function openLoversSpyScreen() {
    setActivePage('loversSpyScreen');
    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return;

    // 渲染导航栏
    const header = document.querySelector('.spy-header');
    if (header) {
        header.innerHTML = `
            <button class="lovers-icon-btn-round" onclick="window.backFromSpyScreen()">
                <i class="fas fa-arrow-left" style="color: #000;"></i>
            </button>
            <h2 style="font-weight: 800; letter-spacing: 1px; font-size: 18px;">${friend.remark || friend.name}的行踪</h2>
            <div style="display: flex; gap: 10px;">
                <button class="lovers-icon-btn-round" onclick="openSpyWeatherModal()" title="天气">
                    <i class="fas fa-cloud-sun" style="color: #000;"></i>
                </button>
                <button class="lovers-icon-btn-round" id="spyRefreshBtn" onclick="refreshSpyLogs(null, true)" title="刷新动态">
                    <i class="fas fa-sync-alt" style="color: #000;"></i>
                </button>
            </div>
        `;
    }

    // 渲染主容器
    const spyContainer = document.querySelector('.spy-container');
    let lastLog = null;
    if (friend.spyLogs && friend.spyLogs.length > 0) {
        const sortedLogs = [...friend.spyLogs].sort((a, b) => (a.time > b.time ? 1 : -1));
        lastLog = sortedLogs[sortedLogs.length - 1];
    }
    const lastActiveTime = lastLog ? lastLog.time : (friend.spyLastActiveTime || "未知");
    const lastSummary = lastLog ? lastLog.summary : "似乎正在休息...";

    spyContainer.innerHTML = `
        <div class="spy-map-container" id="spyEmbeddedMap">
            <div id="spyMapMovableLayer">
                <div class="spy-map-grid-bg"></div>
                <div id="spyMapPinsLayer"></div>
                <div id="spyMapAvatarPin" class="spy-map-avatar-pin" style="top: 50%; left: 50%;">
                    <div class="spy-map-avatar-img" style="${friend.avatarImage ? `background-image: url('${friend.avatarImage}')` : `background-color:#000; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold;`}">
                        ${friend.avatarImage ? '' : (friend.avatar || friend.name[0])}
                    </div>
                </div>
            </div>
            <div style="position: absolute; top: 15px; right: 15px; display: flex; flex-direction: column; gap: 10px; z-index: 1001;">
                <div class="map-control-btn" onclick="doujinOpenAddBuildingModal()" title="手动添加地点" style="background: #fff;">
                    <i class="ri-add-line"></i>
                </div>
                <div class="map-control-btn" id="refreshMapBtn" onclick="generateMapFromAI()" title="AI重新规划地图布局" style="background: #fff;">
                    <i class="ri-refresh-line"></i>
                </div>
            </div>
            <div class="spy-map-status-bubble" style="z-index: 1001;">
                <div>
                    <div style="font-size: 14px; font-weight: bold; color: var(--text-color);">${lastSummary}</div>
                    <div style="font-size: 11px; color: #999;">更新于 ${lastActiveTime} · ${friend.citySettings?.fictionalCity || '未知城市'}</div>
                </div>
                <i class="ri-radar-line" style="color: #007aff; animation: spin 4s linear infinite;"></i>
            </div>
        </div>
        <div class="spy-scroll-view">
            <div id="spy-timeline-list" class="spy-list-wrap integrated-map"></div>
        </div>
    `;

    // 初始化
    initSpyEmbeddedMap(friend, lastLog);
    renderLoversSpyList();
    checkAutoSpyRefresh(friend);
    setTimeout(initSpyMapDragV2, 50);
}

/**
 * 初始化嵌入式地图 (旧版)
 */
function initSpyEmbeddedMap(friend, lastLog) {
    const pinsLayer = document.getElementById('spyMapPinsLayer');
    const avatarPin = document.getElementById('spyMapAvatarPin');
    if(!pinsLayer) return;

    if (!friend.mapLocations || friend.mapLocations.length === 0) {
        generateMapFromAI().then(() => {
            const updatedFriend = friends.find(f => f.id === friend.id);
            initSpyEmbeddedMap(updatedFriend, lastLog);
        });
        return;
    }

    let currentState = null;
    let activeColor = '#333';

    if (lastLog) {
        const sortedLogs = [...(friend.spyLogs || [])].sort((a, b) => (a.time > b.time ? 1 : -1));
        sortedLogs.forEach(log => {
            currentState = calculateLogLocation(friend, log, currentState);
        });
        if (lastLog.icon) activeColor = getSpyIconColor(lastLog.icon);
    }

    pinsLayer.innerHTML = '';
    friend.mapLocations.forEach(loc => {
        let iconClass = 'ri-map-pin-2-fill';
        if (loc.type === 'home') iconClass = 'ri-home-4-fill';
        if (loc.type === 'work') iconClass = 'ri-briefcase-4-fill';
        if (loc.type === 'leisure') iconClass = 'ri-cup-fill';

        const pin = document.createElement('div');
        pin.className = 'spy-map-place';
        const isActiveLocation = currentState && !currentState.isTemp && currentState.name === loc.name;

        let iconStyle = `color: #ccc; transition: all 0.3s;`;
        let textStyle = `color: #999; transition: all 0.3s;`;
        let zIndex = '1';

        if (isActiveLocation) {
            iconStyle = `color: ${activeColor}; transition: all 0.3s;`;
            textStyle = `color: ${activeColor}; font-weight: 800; background: rgba(255,255,255,0.9); padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
            zIndex = '10';
        }

        const x = Math.max(10, Math.min(90, loc.x));
        const y = Math.max(15, Math.min(85, loc.y));
        pin.style.left = x + '%';
        pin.style.top = y + '%';
        pin.style.zIndex = zIndex;
        pin.innerHTML = `<i class="${iconClass}" style="${iconStyle}"></i><span style="${textStyle}">${loc.name}</span>`;
        pin.onclick = () => showToast(`📍 ${loc.name}: ${loc.desc || ''}`);
        pinsLayer.appendChild(pin);
    });

    if (currentState) {
        const targetX = Math.max(10, Math.min(90, currentState.x));
        const targetY = Math.max(15, Math.min(85, currentState.y));

        if (currentState.isTemp) {
            const tempPin = document.createElement('div');
            tempPin.className = 'spy-map-place temp-place';
            tempPin.style.left = targetX + '%';
            tempPin.style.top = targetY + '%';
            tempPin.style.zIndex = '5';
            tempPin.innerHTML = `
                <i class="ri-map-pin-add-fill" style="color: ${activeColor};"></i>
                <span style="color: ${activeColor}; border: 1px dashed ${activeColor}; background:rgba(255,255,255,0.8); font-weight:bold; padding:2px 4px; border-radius:4px;">${currentState.name}</span>
            `;
            pinsLayer.appendChild(tempPin);
        }

        setTimeout(() => {
            avatarPin.style.zIndex = '100';
            avatarPin.style.left = targetX + '%';
            avatarPin.style.top = targetY + '%';
            const avatarImg = avatarPin.querySelector('.spy-map-avatar-img');
            if (avatarImg) {
                avatarImg.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                avatarImg.style.borderColor = '';
            }
            const statusSub = document.querySelector('.spy-map-status-bubble div:first-child div:last-child');
            if (statusSub) {
                 const timeStr = lastLog.time || "未知时间";
                 statusSub.innerHTML = `📍 ${currentState.name} · ${timeStr}`;
            }
            const radarIcon = document.querySelector('.spy-map-status-bubble i');
            if (radarIcon) radarIcon.style.color = activeColor;
        }, 100);
    }
}

/**
 * [升级版] 渲染足迹列表 (支持地点自动高亮)
 */
function renderLoversSpyList() {
    const container = document.getElementById('spy-timeline-list');
    if (!container) return;
    container.innerHTML = '';

    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return;

    const logs = friend.spyLogs || [];
    if (logs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">暂无动态，点击右上角刷新生成</div>';
        return;
    }

    // 获取地图上的所有地点名称，用于匹配高亮
    // 按名称长度倒序排列，防止短名字覆盖长名字（例如防止 "公园" 破坏 "森林公园"）
    const mapLocationNames = (friend.mapLocations || []).map(l => l.name).sort((a, b) => b.length - a.length);

    // --- 内部辅助函数：给文本中的地点加高亮 ---
    const highlightLocations = (text) => {
        if (!text) return "";
        let processedText = text;

        mapLocationNames.forEach(locName => {
            if (!locName) return;
            // 使用正则全局替换，将 地点名 替换为 <span class="...">地点名</span>
            // 这里的 split/join 是最简单安全的替换方法，避免正则特殊字符报错
            const highlightHtml = `<span class="spy-loc-highlight">${locName}</span>`;

            // 为了防止重复替换（比如替换了HTML标签里的字），这里简单处理：
            // 如果文本里包含了这个词，且这个词还没被标签包裹（简单判断），就替换
            // 注意：这是一个简易实现，如果地点名非常短（如“家”），可能会有误伤，但在当前语境下通常没问题
            if (processedText.includes(locName) && !processedText.includes(`>${locName}<`)) {
                 processedText = processedText.split(locName).join(highlightHtml);
            }
        });
        return processedText;
    };
    // ------------------------------------------

    logs.sort((a, b) => (a.time > b.time ? 1 : -1));
    let lastState = null;
    const processedLogs = logs.map(log => {
        const locationInfo = calculateLogLocation(friend, log, lastState);
        lastState = locationInfo;
        return {
            ...log,
            finalLocation: locationInfo.name,
            finalX: locationInfo.x, finalY: locationInfo.y
        };
    });

    processedLogs.reverse().forEach(log => {
        const iconClass = log.icon || 'fa-circle';
        const iconColor = getSpyIconColor(iconClass);

           let rawSummary = log.summary || log.text || "暂无摘要";

    // 【修改】在这里添加去除 ** 的代码
    rawSummary = rawSummary.replace(/\*\*/g, '');

    // 【核心修改点】对显示的摘要进行高亮处理
    const displayedSummary = highlightLocations(rawSummary);

        // 弹窗需要的数据（保持原样，不带HTML标签）
        const safeDetail = encodeURIComponent(log.detail || log.text || "").replace(/'/g, "%27");
        const safeSummary = encodeURIComponent(rawSummary).replace(/'/g, "%27");
        const safeThought = encodeURIComponent(log.thought || "").replace(/'/g, "%27");
        const safeIcon = iconClass.replace(/'/g, "").replace(/"/g, "");
        const safeLocation = encodeURIComponent(log.finalLocation).replace(/'/g, "%27");
        const safeColor = encodeURIComponent(iconColor);
        const rawDetailForBag = (log.detail || "").replace(/"/g, '&quot;');
        const rawSummaryForBag = (log.summary || "").replace(/"/g, '&quot;');

        const html = `
            <div class="spy-item" onclick="openSpyDetailModal('${log.time}', '${safeIcon}', '${safeSummary}', '${safeDetail}', '${safeThought}', '${safeLocation}', '${safeColor}')" style="cursor: pointer;">
                <span class="spy-time-label">${log.time}</span>
                <div class="spy-card">
                    <div class="spy-content-row">
                        <!-- 图标 -->
                        <i class="fas ${safeIcon} spy-icon" style="color: ${iconColor}; background-color: ${iconColor}26;"></i>

                        <!-- 文本区域 -->
                        <div class="spy-text">
                            ${displayedSummary}
                            <span style="float:right; color:#ccc; font-size:12px;"> > </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

/**
 * [V4 终极修正版] 生成角色动态 (强制地点对其)
 */
async function refreshSpyLogs(targetFriend = null, isManual = true) {
    const friend = targetFriend || friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return;

    const btn = document.getElementById('spyRefreshBtn');
    if (isManual && btn && btn.classList.contains('loading')) return;

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) {
        if(isManual) showAlert("API未配置");
        return;
    }

    if (isManual && btn) btn.classList.add('loading');
    if (isManual) showToast(`正在同步 ${friend.name} 的最新动态...`);

    try {
        const now = new Date();
        const todayStr = now.toDateString();

        // 1. 设定起始时间：从凌晨 00:00 开始
        let startTimeStr = "00:00";
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        let lastLogContext = "无（这是今天的第一条动态）";

        if (friend.spyGenDate === todayStr && friend.spyLogs && friend.spyLogs.length > 0) {
            const sortedLogs = [...friend.spyLogs].sort((a, b) => (a.time > b.time ? 1 : -1));
            const lastLog = sortedLogs[sortedLogs.length - 1];
            startTimeStr = lastLog.time;
            lastLogContext = `${lastLog.time} 在 ${lastLog.detail}`;

            const [lh, lm] = startTimeStr.split(':');
            startDate.setHours(lh, lm, 0, 0);
        } else {
             friend.spyLogs = []; // 新的一天清空
        }

        const endTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        if (startDate >= now) {
             if (isManual) showToast("暂无新动态");
             return;
        }

        // --- 【核心修改】提取地图上的确切名字 ---
        let mapLocationInstruction = "";
        let locationNames = [];

        if (friend.mapLocations && friend.mapLocations.length > 0) {
            locationNames = friend.mapLocations.map(l => l.name);
            const namesStr = locationNames.join('", "');

            // 强力指令：告诉 AI 只能用这些词
            mapLocationInstruction = `
【【【 地点强制锁 】】】
你所在的地图只有这几个地点：["${namesStr}"]。
1. **严格匹配**：在描述中，必须**原封不动**地包含上述列表中的某个名字。
2. **禁止同义词**：地图上叫“家”，你就不能写“小区”或“公寓”；地图上叫“工作室”，你就不能写“办公室”。
3. **示例**：
   - 错误：回到住所休息。(地图里没有"住所")
   - 正确：回到**家**休息。
`;
        } else {
            mapLocationInstruction = "地图暂无数据，请主要在‘家’或‘公司’活动。";
        }

        const diffMinutes = (now - startDate) / (1000 * 60);
        let fillerCount = Math.floor(diffMinutes / 60);
        if (fillerCount > 5) fillerCount = 5;
        if (fillerCount < 1) fillerCount = 1;

        const personaId = friend.activeUserPersonaId || 'default_user';
        const activePersona = userPersonas.find(p => p.id === personaId) || userProfile;

                const prompt = `
【任务】: 续写 "${friend.name}" 从 ${startTimeStr} 到 ${endTimeStr} 的 ${fillerCount} 条生活动态。

【当前状态】: ${lastLogContext}
${mapLocationInstruction}

【时间逻辑】:
- 00:00-07:00: 必须在睡觉或熬夜 (地点必须是"家"相关的点)。
- 09:00-18:00: 工作日通常在工作 (地点必须是"工作室"或"公司"相关的点)。
- 其他时间: 自由活动。

【【【关键要求：心声 (thought) 写法】】】
请把 "thought" 字段写成**即时状态签名**的感觉！
- ❌ 错误：(他觉得咖啡很好喝) -> 像旁白，太生硬。
- ✅ 正确：(咖啡续命中...) -> 鲜活。
- ✅ 正确：(好困，想下班) -> 真实。
- ✅ 正确：(今晚吃点什么好呢) -> 生活化。
- 字数：15字以内。

【输出JSON】:
{
  "logs": [
    {
      "time": "HH:MM",
      "summary": "简短状态",
      "detail": "详细描述(包含地点)",
      "thought": "(这里写鲜活的内心独白)",
      "icon": "图标代码"
    }
  ]
}`;


        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        let responseText = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            let result = JSON.parse(jsonMatch[0]);
            let newLogs = result.logs || [];

            // 简单处理
            newLogs.forEach(l => {
                if(l.time.length > 5) l.time = l.time.substring(0, 5);
            });

            if (friend.spyGenDate !== todayStr) friend.spyLogs = newLogs;
            else {
                 const existingTimes = new Set(friend.spyLogs.map(l => l.time));
                 newLogs.forEach(l => { if(!existingTimes.has(l.time)) friend.spyLogs.push(l); });
            }
                        // --- 排序 ---
            friend.spyLogs.sort((a, b) => (a.time > b.time ? 1 : -1));
            friend.spyGenDate = todayStr;

            // ★★★★★【核心修改】关联逻辑开始 ★★★★★
            // 获取最新的一条动态
            const latestLog = friend.spyLogs[friend.spyLogs.length - 1];
            if (latestLog) {
                // 1. 格式化为短句
                const statusText = formatStatusFromLog(latestLog);
                // 2. 存入好友数据
                friend.currentRealtimeStatus = statusText;
                friend.lastStatusUpdateTime = Date.now();

                // 3. 如果当前正在看这个人的聊天窗口，立即刷新标题栏状态
                if (currentChatFriendId === friend.id) {
                    const statusEl = document.getElementById('chatStatusText');
                    if (statusEl) statusEl.innerText = statusText;
                }
            }
            // ★★★★★【核心修改】关联逻辑结束 ★★★★★

            await saveData();

            if (document.getElementById('loversSpyScreen').classList.contains('active')) {

                if(typeof renderLoversSpyList === 'function') renderLoversSpyList();
                if(typeof window.renderSpyUI === 'function') window.renderSpyUI(); // 刷新UI

                // 强制刷新一下地图
                const lastLog = friend.spyLogs[friend.spyLogs.length - 1];
                if(typeof initSpyEmbeddedMap === 'function') initSpyEmbeddedMap(friend, lastLog);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (btn) btn.classList.remove('loading');
    }
}


/**
 * 自动刷新检查
 */
function checkAutoSpyRefresh(friend) {
    const now = new Date();
    const lastSyncStr = friend.spyLastSyncIso;
    let diffMinutes = 999;
    if (lastSyncStr) {
        const lastSync = new Date(lastSyncStr);
        diffMinutes = (now - lastSync) / (1000 * 60);
    }
    if (diffMinutes > 30) {
        console.log(`[视奸页面] 数据过期，静默刷新...`);
        refreshSpyLogs(friend, false);
    }
}
/**
 * [API] 生成地图数据 (修复版：适配新按钮ID)
 */
async function generateMapFromAI() {
    console.log("【调试】开始生成地图...");
    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return alert("错误：找不到当前角色的信息。");

    // 核心修复：优先寻找 btnRedrawMap (新版ID)
    let btn = document.getElementById('btnRedrawMap') || document.getElementById('refreshMapBtn');

    // 如果有按钮，让它转圈
    if(btn) {
        btn.classList.add('loading');
        // 如果是新版带文字的按钮，修改图标状态
        const icon = btn.querySelector('i');
        if(icon) icon.className = 'ri-loader-4-line';
    }

    showToast("正在连接卫星绘制地图...");

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl || !settings.apiKey) {
        if(btn) btn.classList.remove('loading');
        return showAlert("请先在设置中配置API地址和Key！");
    }

    const fCity = friend.citySettings?.fictionalCity || "一座现代化都市";
    const rCity = friend.citySettings?.realCity || "未知";
    const existingNames = (friend.mapLocations || []).map(l => l.name).join('、');
    const mapCount = friend.spySettings?.mapCount || 8;

    const prompt = `
【任务】: 城市规划。请为角色生成 ${mapCount} 个常去的地点坐标。
【角色】: "${friend.name}" (${friend.role})
【城市】: "${fCity}" (现实映射: ${rCity})
【已有】: ${existingNames}
【要求】: 1home, 1work, 其余leisure。
【输出格式】: 纯净 JSON 数组 \`[]\`。
[{"name": "地点名", "type": "home/work/leisure", "desc": "一句话描述"}]
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            })
        });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            let aiRawLocations = JSON.parse(jsonMatch[0]);
            const finalLocations = [];

            // 简单的防重叠算法
            aiRawLocations.forEach(loc => {
                let x,y, safe;
                for(let i=0;i<50;i++){
                    x = Math.floor(Math.random()*70 + 15); // 15-85范围
                    y = Math.floor(Math.random()*70 + 15);
                    safe = true;
                    for(let o of finalLocations) if(Math.hypot(o.x-x, o.y-y) < 15) safe = false;
                    if(safe) break;
                }
                loc.x = x; loc.y = y;
                finalLocations.push(loc);
            });

            friend.mapLocations = finalLocations;
            friend.lastMapTime = new Date().toISOString();
            await saveData();

            // 刷新UI
            if(typeof window.renderSpyUI === 'function') window.renderSpyUI();

            showToast("地图已重绘完成！");
        } else {
            throw new Error("AI没有返回有效的JSON数组");
        }
    } catch (e) {
        console.error(e);
        alert(`生成出错: ${e.message}`);
    } finally {
        // 恢复按钮状态
        if(btn) {
            btn.classList.remove('loading');
            const icon = btn.querySelector('i');
            if(icon) icon.className = 'ri-map-2-line';
        }
    }
}

/**
 * [工具] 计算地点
 */
function calculateLogLocation(friend, log, lastState) {
    const text = (log.summary + log.detail + (log.thought || "")).toLowerCase();
    if (friend.mapLocations && friend.mapLocations.length > 0) {
        const sortedLocs = [...friend.mapLocations].sort((a, b) => b.name.length - a.name.length);
        for (const loc of sortedLocs) {
            if (text.includes(loc.name.toLowerCase())) {
                return { name: loc.name, type: loc.type, x: loc.x, y: loc.y, isTemp: false };
            }
        }
    }
    if (lastState) return lastState;
    if (friend.mapLocations) {
        const homeKeywords = ['睡', '家', '醒', '床', '洗澡', '休息', '晚安', '早安'];
        const workKeywords = ['工作', '会', '班', 'ppt', '写', '忙', '工位'];
        if (homeKeywords.some(k => text.includes(k))) {
            const home = friend.mapLocations.find(l => l.type === 'home');
            if (home) return { name: home.name, type: 'home', x: home.x, y: home.y, isTemp: false };
        }
        if (workKeywords.some(k => text.includes(k))) {
            const work = friend.mapLocations.find(l => l.type === 'work');
            if (work) return { name: work.name, type: 'work', x: work.x, y: work.y, isTemp: false };
        }
        const defaultHome = friend.mapLocations.find(l => l.type === 'home');
        if (defaultHome) return { name: defaultHome.name, type: 'home', x: defaultHome.x, y: defaultHome.y, isTemp: false };
    }
    return { name: "未知地点", type: "temp", x: 50, y: 50, isTemp: true };
}

/**
 * [工具] 图标颜色算法
 */
function getSpyIconColor(iconClass) {
    const str = iconClass.toLowerCase();
    let baseHue = 0;
    let isSpecial = false;
    if (str.includes('bed') || str.includes('moon') || str.includes('night')) { baseHue = 260; isSpecial = true; }
    else if (str.includes('food') || str.includes('coffee') || str.includes('utensils')) { baseHue = 25; isSpecial = true; }
    else if (str.includes('work') || str.includes('book') || str.includes('laptop')) { baseHue = 210; isSpecial = true; }
    else if (str.includes('car') || str.includes('walk') || str.includes('map')) { baseHue = 150; isSpecial = true; }
    else if (str.includes('heart') || str.includes('love') || str.includes('game')) { baseHue = 340; isSpecial = true; }
    else if (str.includes('shop') || str.includes('money')) { baseHue = 45; isSpecial = true; }

    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let h, s, l;

    if (isSpecial) {
        const variation = hash % 30 - 15;
        h = baseHue + variation;
    } else {
        h = Math.abs(hash % 360);
    }
    s = 65 + (Math.abs(hash) % 20);
    l = 60 + (Math.abs(hash) % 15);
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * [工具] 获取AI上下文
 */
function getSpyContextForAI(friend) {
    if (!friend.spyLogs || friend.spyLogs.length === 0) return "";
    const sortedLogs = [...friend.spyLogs].sort((a, b) => (a.time > b.time ? 1 : -1));
    let context = `【今日行动轨迹】\n`;
    sortedLogs.forEach(log => {
        context += `- [${log.time}] ${log.summary}。\n  > 细节: ${log.detail}\n  > 当时心声: ${log.thought}\n`;
    });
    return context + "\n";
}

// ==========================================
// 5. 地图与天气弹窗逻辑 (通用)
// ==========================================
/**
 * [API] 打开天气弹窗 (修复版：适配新按钮ID)
 */
async function openSpyWeatherModal() {
    console.log("【调试】点击了天气按钮");
    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return;

    // 核心修复：优先寻找 btnWeather
    const btn = document.getElementById('btnWeather');
    if (btn) {
        btn.classList.add('loading');
        const icon = btn.querySelector('i');
        if(icon) icon.className = 'ri-loader-4-line'; // 转圈图标
    }

    // 1. 获取城市 (如果没有配置，默认北京/上海)
    let realCity = "Shanghai";
    let fictionalCity = "未知城市";

    if (friend.citySettings && friend.citySettings.realCity) {
        realCity = friend.citySettings.realCity;
        fictionalCity = friend.citySettings.fictionalCity || realCity;
    } else {
        // 如果没配置，静默使用默认值，不弹窗打断体验
        fictionalCity = "默认城市";
    }

    // 2. 显示弹窗骨架
    const contentArea = document.getElementById('weatherContentArea');
    if(document.getElementById('spyWeatherFictionalName')) document.getElementById('spyWeatherFictionalName').textContent = fictionalCity.toUpperCase();
    if(document.getElementById('spyWeatherRealName')) document.getElementById('spyWeatherRealName').textContent = `SOURCE: ${realCity.toUpperCase()}`;

    document.getElementById('spyWeatherModal').classList.add('show');

    // 3. 检查当天缓存 (减少API调用)
    const now = new Date();
    const todayStr = now.toDateString();

    if (friend.weatherCache && friend.weatherCache.date === todayStr && friend.weatherCache.city === realCity) {
        renderBWWeatherUI(friend.weatherCache.data);
        if(btn) {
            btn.classList.remove('loading');
            btn.querySelector('i').className = 'ri-sun-cloudy-line';
        }
        return;
    }

    // 4. 显示加载中
    if(contentArea) contentArea.innerHTML = `<div style="text-align: center; padding: 60px 0; color: #999;">正在同步气象卫星...</div>`;

    // 5. 请求天气 API
    try {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(realCity)}?format=j1&lang=zh`);
        if (!response.ok) throw new Error("Weather API Error");

        const data = await response.json();

        renderBWWeatherUI(data);

        // 保存缓存
        friend.weatherCache = { date: todayStr, city: realCity, data: data };
        await saveData();

    } catch (e) {
        console.error("天气获取失败:", e);
        if(contentArea) {
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: #999;">
                    <i class="ri-wifi-off-line" style="font-size: 30px; margin-bottom: 10px; display:block;"></i>
                    信号连接失败<br>
                    <span style="font-size:10px">请检查网络或城市名称</span>
                </div>`;
        }
    } finally {
        // 恢复按钮状态
        if(btn) {
            btn.classList.remove('loading');
            const icon = btn.querySelector('i');
            if(icon) icon.className = 'ri-sun-cloudy-line';
        }
    }
}

function renderBWWeatherUI(data) {
    const current = data.current_condition[0];
    const weatherDesc = current.lang_zh ? current.lang_zh[0].value : current.weatherDesc[0].value;
    let iconClass = 'ri-sun-line';
    if (weatherDesc.includes('雨')) iconClass = 'ri-rainy-line';
    else if (weatherDesc.includes('雪')) iconClass = 'ri-snowy-line';
    else if (weatherDesc.includes('阴') || weatherDesc.includes('云')) iconClass = 'ri-cloudy-line';

    const html = `
        <div class="bw-weather-main">
            <div class="bw-temp-huge">${current.temp_C}°</div>
            <div style="display: flex; flex-direction: column; align-items: flex-end;">
                <i class="${iconClass} bw-weather-icon"></i>
                <div class="bw-weather-desc">${weatherDesc}</div>
            </div>
        </div>
        <div class="bw-data-grid">
            <div class="bw-data-item"><span class="bw-data-label">HUMIDITY</span><span class="bw-data-value">${current.humidity}%</span></div>
            <div class="bw-data-item"><span class="bw-data-label">WIND</span><span class="bw-data-value">${current.windspeedKmph} km/h</span></div>
        </div>
    `;
    const area = document.getElementById('weatherContentArea');
    if(area) area.innerHTML = html;
}

function closeSpyWeatherModal() {
    document.getElementById('spyWeatherModal').classList.remove('show');
}

function doujinOpenAddBuildingModal() {
    document.getElementById('newBuildingName').value = '';
    document.getElementById('newBuildingDesc').value = '';
    document.getElementById('addBuildingModal').classList.add('show');
}

async function confirmAddBuilding() {
    const name = document.getElementById('newBuildingName').value.trim();
    const desc = document.getElementById('newBuildingDesc').value.trim();
    if (!name) return showAlert("请输入地点名称");

    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend) return;
    if (!friend.mapLocations) friend.mapLocations = [];

    // 随机位置
    let x = Math.random() * 80 + 10;
    let y = Math.random() * 70 + 15;

    friend.mapLocations.push({ name: name, desc: desc, type: "leisure", x: x, y: y });
    await saveData();

    // 刷新两个版本的UI
    if(typeof renderMapUI === 'function') renderMapUI(friend.mapLocations);
    if(typeof initSpyEmbeddedMap === 'function') initSpyEmbeddedMap(friend, null);
    if(typeof window.renderSpyUI === 'function') window.renderSpyUI();

    document.getElementById('addBuildingModal').classList.remove('show');
}

async function deleteMapLocation(index) {
    const friend = friends.find(f => f.id === currentLoversFriendId);
    if (!friend || !friend.mapLocations) return;
    friend.mapLocations.splice(index, 1);
    await saveData();
    // 刷新两个版本的UI
    if(typeof renderMapUI === 'function') renderMapUI(friend.mapLocations);
    if(typeof window.renderSpyUI === 'function') window.renderSpyUI();
}

function renderMapUI(locations) {
    const pinsContainer = document.getElementById('mapPinsContainer');
    const listContainer = document.getElementById('mapLocationsList');
    if(!pinsContainer || !listContainer) return;
    pinsContainer.innerHTML = '';
    listContainer.innerHTML = '';

    locations.forEach((loc, index) => {
        const x = Math.max(10, Math.min(90, loc.x));
        const y = Math.max(10, Math.min(90, loc.y));
        let iconClass = 'ri-map-pin-2-fill';

        const pin = document.createElement('div');
        pin.className = 'map-pin';
        pin.style.left = x + '%';
        pin.style.top = y + '%';
        pin.innerHTML = `<div class="map-pin-icon"><i class="${iconClass}"></i></div><div class="map-pin-label">${loc.name}</div>`;
        pinsContainer.appendChild(pin);

        const item = document.createElement('div');
        item.className = 'map-list-item';
        item.innerHTML = `
            <div class="map-list-icon"><i class="${iconClass}"></i></div>
            <div class="map-list-info"><div class="map-list-name">${loc.name}</div></div>
            <div class="map-list-delete" onclick="deleteMapLocation(${index})"><i class="ri-delete-bin-line"></i></div>
        `;
        listContainer.appendChild(item);
    });
}

// 帮下单逻辑
async function confirmHelpOrder() {
    const selected = document.querySelector('input[name="cartShareTarget"]:checked');
    if (!selected) return showAlert('请选择一位好友');
    const friendId = selected.value;
    const selectedItems = storeCartItems.filter(i => i.selected);
    if (selectedItems.length === 0) return showAlert("请先勾选商品");
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.count), 0);
    const itemNames = selectedItems.map(i => i.title).join('、');
    closeSharePostModal();
    startPaymentProcess('help_order', totalAmount, {
        friendId: friendId,
        itemNames: itemNames,
        items: selectedItems
    });
}

// ==========================================
// 6. 地图交互逻辑 (V4 缩放版)
// ==========================================

function initSpyMapDragV2() {
    const container = document.getElementById('spyEmbeddedMap');
    const layer = document.getElementById('spyMapMovableLayer');
    if (!container || !layer) return;

    spyMapState = { isDragging: false, isPinching: false, startX: 0, startY: 0, currentX: -50, currentY: -50, lastX: -50, lastY: -50, scale: 1, startDist: 0 };
    updateTransform();

    container.style.touchAction = 'none';
    container.style.cursor = 'grab';

    function updateTransform() {
        if (spyMapState.scale < 0.5) spyMapState.scale = 0.5;
        if (spyMapState.scale > 3) spyMapState.scale = 3;
        layer.style.transform = `translate(${spyMapState.currentX}px, ${spyMapState.currentY}px) scale(${spyMapState.scale})`;
    }

    function getDistance(touches) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }

    const onWheel = (e) => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const oldScale = spyMapState.scale;
        const newScale = oldScale + delta;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        spyMapState.currentX = centerX - (centerX - spyMapState.currentX) * (newScale / oldScale);
        spyMapState.currentY = centerY - (centerY - spyMapState.currentY) * (newScale / oldScale);
        spyMapState.scale = newScale;
        spyMapState.lastX = spyMapState.currentX;
        spyMapState.lastY = spyMapState.currentY;
        updateTransform();
    };

    const onStart = (e) => {
        if (e.target.closest('.map-control-btn') || e.target.closest('.spy-map-status-bubble')) return;
        if (e.type === 'touchstart' && e.touches.length === 2) {
            spyMapState.isPinching = true;
            spyMapState.isDragging = false;
            spyMapState.startDist = getDistance(e.touches);
            return;
        }
        if (e.type === 'mousedown' || (e.type === 'touchstart' && e.touches.length === 1)) {
            spyMapState.isDragging = true;
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            spyMapState.startX = clientX;
            spyMapState.startY = clientY;
            container.style.cursor = 'grabbing';
            layer.style.transition = 'none';
        }
    };

    const onMove = (e) => {
        if (spyMapState.isPinching && e.type === 'touchmove' && e.touches.length === 2) {
            e.preventDefault();
            const newDist = getDistance(e.touches);
            const zoomSpeed = 0.05;
            if (newDist > spyMapState.startDist) spyMapState.scale += zoomSpeed;
            else if (newDist < spyMapState.startDist) spyMapState.scale -= zoomSpeed;
            spyMapState.startDist = newDist;
            updateTransform();
            return;
        }
        if (!spyMapState.isDragging) return;
        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const dx = clientX - spyMapState.startX;
        const dy = clientY - spyMapState.startY;
        spyMapState.currentX = spyMapState.lastX + dx;
        spyMapState.currentY = spyMapState.lastY + dy;
        updateTransform();
    };

    const onEnd = (e) => {
        if (spyMapState.isPinching && (!e.touches || e.touches.length < 2)) {
            spyMapState.isPinching = false;
            spyMapState.lastX = spyMapState.currentX;
            spyMapState.lastY = spyMapState.currentY;
            return;
        }
        if (spyMapState.isDragging) {
            spyMapState.isDragging = false;
            spyMapState.lastX = spyMapState.currentX;
            spyMapState.lastY = spyMapState.currentY;
            container.style.cursor = 'grab';
            layer.style.transition = 'transform 0.3s ease-out';
            updateTransform();
        }
    };

    container.onwheel = onWheel;
    container.onmousedown = onStart;
    container.ontouchstart = onStart;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

// ==========================================
// 7. V25 新版地图逻辑 (黑白风格)
// ==========================================
// [重构版] 强制打开视奸地图 (修复图层遮挡)
window.forceOpenSpyMap = function() {
    if (typeof friends === 'undefined' || !currentChatFriendId) return alert("请先进入聊天窗口！");
    const friend = friends.find(f => f.id === currentChatFriendId);
    if (friend && friend.isGroup) return alert("群聊无法查看足迹。");

    // 1. 设置全局状态
    window.spyState.friendId = currentChatFriendId;
    window.currentLoversFriendId = currentChatFriendId;

    // 2. 初始化数据
    if (!friend.spyLogs) friend.spyLogs = [];
    if (!friend.mapLocations) friend.mapLocations = [];

    // 3. 渲染界面
    const container = document.querySelector('#loversSpyScreen .spy-container');
    const header = document.querySelector('#loversSpyScreen .spy-header');

    if (header) {
        header.className = 'spy-header-flex';
        header.innerHTML = `
            <button class="lovers-icon-btn-round" onclick="forceBackFromSpy()" style="background:#fff; border:1px solid #eee;">
                <i class="fas fa-arrow-left" style="color: #333;"></i>
            </button>
            <div class="spy-header-title-center">${friend.remark||friend.name}</div>
            <!-- 按钮 5: 高级设置 -->
                        <div class="map-fab" onclick="window.spyBtnSettings(this)">
                            <i class="ri-settings-3-line"></i> <span>设置</span>
                        </div>
        `;
    }

    if (container) {
        const avatarUrl = friend.avatarImage ? `background-image:url('${friend.avatarImage}')` : `background-color:#000;color:#fff;display:flex;align-items:center;justify-content:center;`;

        container.innerHTML = `
            <div class="spy-bw-container" style="background:#fff; height:100%; display:flex; flex-direction:column;">

                <!-- 地图区域 -->
                <div class="spy-map-container spy-map-box" id="spyEmbeddedMap" style="height: 320px; flex-shrink:0; position:relative; overflow:hidden;">

                    <!-- 1. 位于底层的地图拖拽层 (Z-Index: 1) -->
                    <div id="spyMapMovableLayer" style="width:100%; height:100%; position:absolute; top:0; left:0; z-index: 1;">
                        <div style="width:100%; height:100%;"></div>
                        <div id="spyMapPinsLayer"></div>
                        <div id="spyMapAvatarPin" class="bw-avatar-pin" style="left: 50%; top: 50%; ${avatarUrl}">
                            ${friend.avatarImage ? '' : friend.name[0]}
                        </div>
                    </div>

                                       <!-- 2. 右侧悬浮 5 个功能按钮 (已修复点击事件) -->
                    <div class="map-fab-group">

                        <!-- 按钮 1: 添加地点 -->
                        <div class="map-fab" onclick="window.spyBtnAdd(this)">
                            <i class="ri-map-pin-add-line"></i> <span>添加</span>
                        </div>

                        <!-- 按钮 2: 天气查询 -->
                        <div class="map-fab" onclick="window.spyBtnWeather(this)">
                            <i class="ri-sun-cloudy-line"></i> <span>天气</span>
                        </div>

                        <!-- 按钮 3: 重绘地图 -->
                        <div class="map-fab" onclick="window.spyBtnRedraw(this)">
                            <i class="ri-map-2-line"></i> <span>重绘</span>
                        </div>

                        <!-- 按钮 4: 刷新动态 -->
                        <div class="map-fab" onclick="window.spyBtnRefresh(this)">
                            <i class="ri-refresh-line"></i> <span>刷新</span>
                        </div>



                    </div>


                    <!-- 运势 (Z-Index: 9999) -->
                    <div class="luck-dashboard" id="luckDashboard" style="z-index: 9999; pointer-events: auto;">
                        <div class="luck-dot luck-mid" id="luckDot"></div>
                        <span>运势: <span id="luckText">--</span></span>
                    </div>

                    <!-- 气泡弹窗 -->
                    <div class="map-info-bubble" id="mapInfoBubble" style="z-index: 10000;">
                         <div style="display:flex; align-items:center; gap:12px;">
                            <div class="map-popup-text"><h4 id="bubbleTitle"></h4></div>
                        </div>
                        <i class="ri-close-circle-fill" onclick="window.hideMapPopup()"></i>
                    </div>
                </div>

                <div class="bw-scroll-view" style="flex:1; overflow-y:auto; background:#fff;">
                    <div id="spy-timeline-list" class="timeline-box"></div>
                </div>
            </div>
        `;
    }

    if (typeof setActivePage === 'function') setActivePage('loversSpyScreen');

    setTimeout(() => {
        // 渲染UI
        if (window.renderSpyUI) window.renderSpyUI();
        if (window.initMapInteraction) window.initMapInteraction();

        // [核心] 强行绑定按钮事件，不依赖 onclick
        window.rebindSpyButtons();

        // 自动重绘检查
        if (!friend.mapLocations || friend.mapLocations.length === 0) {
            window.spy_triggerRedraw();
        }
    }, 200);
};
// [最终修正版 V29] UI 渲染 (修复地名被切断/重复高亮问题)
window.renderSpyUI = function() {
    const friend = friends.find(f => f.id === window.spyState.friendId);
    if(!friend) return;

    // A. 幸运值 (保持不变)
    const luck = friend.luckValue || 50;
    const luckDot = document.getElementById('luckDot');
    const luckText = document.getElementById('luckText');
    if(document.getElementById('luckNum')) document.getElementById('luckNum').innerText = luck;
    if(luckDot) {
        if(luck > 70) { luckDot.className='luck-dot luck-high'; if(luckText) luckText.innerText='大吉'; }
        else if(luck < 30) { luckDot.className='luck-dot luck-low'; if(luckText) luckText.innerText='凶险'; }
        else { luckDot.className='luck-dot luck-mid'; if(luckText) luckText.innerText='平稳'; }
    }

    // B. 地图 Pins (保持不变)
    const pinsLayer = document.getElementById('spyMapPinsLayer');
    if(pinsLayer) {
        pinsLayer.innerHTML = '';
        if (friend.mapLocations) {
            friend.mapLocations.forEach((loc) => {
                const safeName = loc.name.replace(/'/g, "\\'");
                const safeDesc = (loc.desc || "").replace(/'/g, "\\'");
                pinsLayer.insertAdjacentHTML('beforeend', `
                    <div class="bw-mini-pin" style="left:${loc.x}%; top:${loc.y}%;"
                         onclick="window.showMapPopup(event, '${safeName}', '${safeDesc}', this)">
                        <div class="bw-pin-icon"></div>
                        <div class="bw-pin-label">${loc.name}</div>
                    </div>
                `);
            });
        }
    }

    // C. 列表 (核心修改区域)
    const listContainer = document.getElementById('spy-timeline-list');
    if(listContainer) {
        listContainer.innerHTML = '';

        // --- 1. 智能高亮核心逻辑 ---

        // 获取所有地点名称，去除空白
        const rawNames = (friend.mapLocations || []).map(l => l.name).filter(n => n && n.trim() !== "");

        // 【关键步骤 A】按长度倒序排列 (确保 "孤岛书店" 排在 "书店" 前面)
        rawNames.sort((a, b) => b.length - a.length);

        // 【关键步骤 B】构建一次性正则表达式
        // 这一步会生成类似 /(孤岛书店|书店|咖啡馆)/g 的正则
        // 从而保证匹配时的贪婪性（优先匹配长词）
        let highlightRegex = null;
        if (rawNames.length > 0) {
            // 对地名中的特殊符号进行转义，防止正则报错
            const escapedNames = rawNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            highlightRegex = new RegExp(`(${escapedNames.join('|')})`, 'g');
        }

        const highlightLocations = (text) => {
            if (!text || !highlightRegex) return text || "";
            // 使用正则一次性替换，避免重复处理和切断
            return text.replace(highlightRegex, '<span class="spy-loc-highlight">$1</span>');
        };
        // ------------------------

        if (friend.spyLogs && friend.spyLogs.length > 0) {
            const logs = [...friend.spyLogs].sort((a, b) => (a.time > b.time ? -1 : 1));
            logs.forEach((log, index) => {
                const isLast = index === logs.length - 1;
                let rowClass = "time-row";
                if (log.isLucky) rowClass += " lucky";
                if (log.isUnlucky) rowClass += " unlucky";

                let baseTemp = 25;
                if (friend.weatherCache && friend.weatherCache.data) baseTemp = parseInt(friend.weatherCache.data.current_condition[0].temp_C);
                const hour = parseInt(log.time.split(':')[0]);
                let tempOffset = (hour >= 12 && hour <= 16) ? 2 : ((hour >= 6 && hour < 10) ? -3 : ((hour >= 18 && hour < 22) ? -2 : -5));
                const displayTemp = log.weather && log.weather.includes('°') ? log.weather : `${baseTemp + tempOffset}°C`;

                const rawDetail = (log.detail || "").replace(/"/g, '&quot;');
                const rawSummary = (log.summary || "").replace(/"/g, '&quot;');

                // --- 2. 应用高亮 ---
                const displaySummary = highlightLocations(log.summary);
                const displayDetail = highlightLocations(log.detail);

                const html = `
                    <div class="${rowClass}">
                        <div class="t-left">
                            <div class="t-time">${log.time}</div>
                            <div class="t-weather">${displayTemp}</div>
                            <div class="t-bag-btn"
                                 data-time="${log.time}"
                                 data-summary="${rawSummary}"
                                 data-detail="${rawDetail}"
                                 onclick="event.preventDefault(); window.checkSpyBag(event)">
                                <i class="ri-shopping-bag-3-line"></i>
                            </div>
                            ${!isLast ? '<div class="t-line"></div>' : ''}
                            <div class="t-dot"></div>
                        </div>
                        <div class="t-card" onclick="this.classList.toggle('expanded')">
                            <!-- 使用高亮后的文本 -->
                            <div class="t-summary">${displaySummary}</div>
                            <div class="t-detail">${displayDetail}</div>
                            ${log.location ? `<span class="t-loc-tag"><i class="ri-map-pin-line"></i> ${log.location}</span>` : ''}
                            <div class="t-thought">💭 ${log.thought || '...'}</div>
                        </div>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', html);

            });
        } else {
            listContainer.innerHTML = '<div style="text-align:center; color:#ccc; padding-top:40px;">暂无动态</div>';
        }
    }

    // D. 更新头像位置 (保持不变)
    const lastLog = (friend.spyLogs && friend.spyLogs.length > 0) ?
        [...friend.spyLogs].sort((a, b) => (a.time > b.time ? -1 : 1))[0] : null;
    if (lastLog) {
        const pos = calculateAvatarPos(friend, lastLog);
        const pin = document.getElementById('spyMapAvatarPin');
        if(pin) {
            pin.style.left = pos.x + '%';
            pin.style.top = pos.y + '%';
        }
    }
};

/**
 * [V4 终极修正版] 计算头像位置
 * 特性：增加对“小区”的识别，移除时间强制跳转
 */
function calculateAvatarPos(friend, lastLog) {
    let pos = { x: 50, y: 50 }; // 默认中心
    if (!friend.mapLocations || friend.mapLocations.length === 0 || !lastLog) return pos;

    const text = (lastLog.summary + lastLog.detail + (lastLog.thought || "")).toLowerCase();
    const locs = friend.mapLocations;

    // 1. 优先：完全匹配地图上的名字 (最长匹配原则)
    // 比如：地图上有"幸福小区"，动态里有"幸福小区"，直接命中
    const sortedLocs = [...locs].sort((a,b) => b.name.length - a.name.length);
    let matched = sortedLocs.find(loc => text.includes(loc.name.toLowerCase()));

    // 2. 其次：模糊关键词匹配
    if (!matched) {
        const keywordMap = [
            // 这里的 'type' 必须对应你在数据库里存的 type，或者我们直接找最接近的点
            // 增加 "小区", "寓", "宅" 等词汇
            { keys: ['家', '睡觉', '床', '卧', '小区', '寓', '宅', '休息', '醒'], type: 'home' },
            { keys: ['公司', '班', '工位', '工作', '室', '忙'], type: 'work' },
            { keys: ['吃', '饭', '饿', '饮', '店'], type: 'leisure' }
        ];

        for (const map of keywordMap) {
            if (map.keys.some(k => text.includes(k))) {
                matched = locs.find(l => l.type === map.type);
                // 如果找不到 type，就尝试找名字里包含关键词的点
                if (!matched) {
                     matched = locs.find(l => map.keys.some(k => l.name.includes(k)));
                }
                if (matched) break;
            }
        }
    }

    // 3. 命中处理
    if (matched) {
        pos.x = matched.x;
        pos.y = matched.y;
    } else {
        // 4. 【关键修改】如果什么都没匹配到：
        // 以前是白天强制去工作，现在改为：如果是深夜，强制回家；否则保持不动(或默认回家)。
        // 这样可以避免"在家休息"被强制送到工作室。

        const hour = parseInt(lastLog.time.split(':')[0]);

        // 只有深夜才强制归位，白天如果没识别到，就默认显示在"家"（比较安全），或者不做改变
        if (hour >= 23 || hour < 8) {
            const home = locs.find(x => x.type === 'home');
            if(home) { pos.x = home.x; pos.y = home.y; }
        } else {
            // 白天没识别出来，大概率也是在家或者在摸鱼，优先显示在家，而不是工作室
            const home = locs.find(x => x.type === 'home');
            if(home) { pos.x = home.x; pos.y = home.y; }
        }
    }

    return pos;
}


// 3. 交互与辅助功能 (V25)
window.showMapPopup = function(e, name, desc, el) {
    if(e)e.stopPropagation();
    if(window.spyState.isAddingMode) return;
    document.querySelectorAll('.bw-mini-pin').forEach(p=>p.classList.remove('active'));
    if(el)el.classList.add('active');
    document.getElementById('bubbleTitle').innerText=name;
    document.getElementById('bubbleDesc').innerText=desc;
    document.getElementById('mapInfoBubble').classList.add('show');
};
window.hideMapPopup = function() {
    document.getElementById('mapInfoBubble').classList.remove('show');
    document.querySelectorAll('.bw-mini-pin').forEach(p=>p.classList.remove('active'));
};
window.startAddLocationMode = function() {
    window.spyState.isAddingMode=true;
    document.getElementById('spyEmbeddedMap').style.cursor='crosshair';
    document.getElementById('btnAddSpot').classList.add('add-active');
    document.getElementById('addLocationTip').classList.add('show');
    window.hideMapPopup();
};
// [修复版] 地图交互核心逻辑：支持手机双指缩放 + 电脑滚轮缩放
window.initMapInteraction = function() {
    const c = document.getElementById('spyEmbeddedMap');
    const l = document.getElementById('spyMapMovableLayer');
    if (!c || !l) return;

    // 状态变量
    let isDragging = false;
    let isPinching = false;
    let startX, startY; // 拖拽起始点
    let lastDist = 0;   // 双指缩放起始距离

    // 辅助：应用变换 (位移 + 缩放)
    const uv = () => l.style.transform = `translate(${window.spyState.currentX}px,${window.spyState.currentY}px) scale(${window.spyState.scale})`;

    // 辅助：计算两个手指间的距离
    const getDist = (touches) => {
        return Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
        );
    };

    // --- 1. 按下/触摸开始 ---
    const handleStart = (e) => {
        // 排除掉点击按钮、气泡的情况
        if (e.target.closest('.map-fab') || e.target.closest('.map-info-bubble') || e.target.closest('.luck-dashboard')) {
            return;
        }

        // 添加地点模式下，不触发拖拽
        if (window.spyState.isAddingMode) {
            e.stopPropagation();
            handleAddLocationClick(e);
            return;
        }

        // === 核心修改：检测双指操作 ===
        if (e.touches && e.touches.length === 2) {
            isDragging = false; // 停止拖拽
            isPinching = true;  // 开始缩放
            lastDist = getDist(e.touches); // 记录初始距离
            return;
        }

        // 单指/鼠标操作 -> 准备拖拽
        isDragging = true;
        const p = e.touches ? e.touches[0] : e;
        startX = p.clientX - window.spyState.currentX;
        startY = p.clientY - window.spyState.currentY;
        c.style.cursor = 'grabbing';
    };

    // --- 2. 移动中 ---
    const handleMove = (e) => {
        // 阻止浏览器默认行为（如页面滚动、网页整体缩放）
        if (e.cancelable) e.preventDefault();

        // === 核心修改：处理双指缩放 ===
        if (isPinching && e.touches && e.touches.length === 2) {
            const currentDist = getDist(e.touches);
            if (lastDist > 0) {
                // 计算缩放比例变化
                const diff = currentDist - lastDist;
                const speed = 0.005; // 缩放灵敏度，调大更灵敏

                // 更新全局缩放值 (限制在 0.5倍 到 3倍 之间)
                window.spyState.scale = Math.min(Math.max(0.5, window.spyState.scale + diff * speed), 3);

                uv(); // 应用更新
            }
            lastDist = currentDist; // 更新距离记录
            return;
        }

        // 处理单指拖拽
        if (!isDragging) return;
        const p = e.touches ? e.touches[0] : e;
        window.spyState.currentX = p.clientX - startX;
        window.spyState.currentY = p.clientY - startY;
        uv();
    };

    // --- 3. 结束 ---
    const handleEnd = (e) => {
        // 如果手指少于2根，停止缩放
        if (e.touches && e.touches.length < 2) {
            isPinching = false;
        }
        // 如果所有手指离开，停止拖拽
        if (!e.touches || e.touches.length === 0) {
            isDragging = false;
            c.style.cursor = 'grab';
        }
    };

    // 绑定事件 (同时支持鼠标和触摸)
    c.onmousedown = handleStart;
    c.ontouchstart = handleStart;

    // 绑定到 document 防止拖出边界丢失
    document.onmousemove = handleMove;
    document.ontouchmove = handleMove; // 这里必须绑定 touchmove

    document.onmouseup = handleEnd;
    document.ontouchend = handleEnd;

    // 电脑端滚轮缩放 (保持不变)
    c.onwheel = (e) => {
        e.preventDefault();
        window.spyState.scale = Math.min(Math.max(0.5, window.spyState.scale + e.deltaY * -0.001), 3);
        uv();
    };
};



async function handleAddLocationClick(e) {
    const l=document.getElementById('spyMapMovableLayer'),r=l.getBoundingClientRect(),c=e.touches?e.touches[0].clientX:e.clientX,cy=e.touches?e.touches[0].clientY:e.clientY,x=(c-r.left)/r.width*100,y=(cy-r.top)/r.height*100;
    window.spyState.isAddingMode=false;
    document.getElementById('spyEmbeddedMap').style.cursor='grab';
    document.getElementById('btnAddSpot').classList.remove('add-active');
    document.getElementById('addLocationTip').classList.remove('show');

    if(typeof openNameInputModal==='function'){
        openNameInputModal("地点名称",async(n)=>{
            if(n){
                const d=prompt("描述:")||"自定义";
                const f=friends.find(x=>x.id===window.spyState.friendId);
                f.mapLocations.push({name:n,type:'leisure',x,y,desc:d});
                await saveData();
                window.renderSpyUI();
            }
        });
    }else{
        const n=prompt("名称:");
        if(n){
            const f=friends.find(x=>x.id===window.spyState.friendId);
            f.mapLocations.push({name:n,type:'leisure',x,y,desc:"自定义"});
            await saveData();
            window.renderSpyUI();
        }
    }
}

// 4. 自动刷新与设置 (V25)
window.checkAllAutoUpdates = async function(f) {
    const n=Date.now(),s=f.spySettings;
    if(n-new Date(f.lastSpyLogTime||0).getTime()>s.logInterval*60000) await window.forceRefreshLogs(false);
    if(n-new Date(f.lastWeatherTime||0).getTime()>s.weatherInterval*60000) await window.refreshWeather();
    if(n-new Date(f.lastLuckTime||0).getTime()>s.luckInterval*60000){f.luckValue=Math.floor(Math.random()*100);f.lastLuckTime=new Date().toISOString();await saveData();}
    if(s.mapInterval>0 && n-new Date(f.lastMapTime||0).getTime()>s.mapInterval*60000) await window.generateMapFromAI();
};

window.forceRefreshLogs = async function(r=false) {
    const f=friends.find(x=>x.id===window.spyState.friendId),b=document.getElementById('btnRefreshLog');
    if(b){b.classList.add('loading');b.querySelector('i').className='ri-loader-4-line';}
    // 复用通用的 API 调用
    await refreshSpyLogs(f, r);
    if(b){b.classList.remove('loading');b.querySelector('i').className='fas fa-sync-alt';}
};

window.refreshWeather = async function() {
    const b=document.getElementById('btnWeather');
    if(b){b.classList.add('loading');b.querySelector('i').className='ri-loader-4-line';}
    // 复用通用天气逻辑
    await openSpyWeatherModal();
    if(b){b.classList.remove('loading');b.querySelector('i').className='ri-sun-cloudy-line';}
};

window.openAdvancedSpySettings = function() {
    const f=friends.find(x=>x.id===window.spyState.friendId),s=f.spySettings;
    let m=document.getElementById('spySettingsModal');
    if(!m){m=document.createElement('div');m.id='spySettingsModal';m.className='modal';m.innerHTML='<div class="modal-content"><div class="modal-title">功能设置</div><div id="spySettingsForm"></div></div>';document.body.appendChild(m);}
    document.getElementById('spySettingsForm').innerHTML=`<div class="spy-settings-row"><label class="spy-settings-label">生成地点数量</label><input type="number" id="setMapCount" class="spy-settings-input" value="${s.mapCount}" min="4" max="12"></div><div class="spy-settings-row"><label class="spy-settings-label">动态检查间隔(分)</label><input type="number" id="setLogInt" class="spy-settings-input" value="${s.logInterval}" min="10"></div><div class="spy-settings-row"><label class="spy-settings-label">天气更新间隔(分)</label><input type="number" id="setWeatherInt" class="spy-settings-input" value="${s.weatherInterval}" min="60"></div><div class="spy-settings-row"><label class="spy-settings-label">幸运值重置间隔(分)</label><input type="number" id="setLuckInt" class="spy-settings-input" value="${s.luckInterval}" min="60"></div><div class="spy-settings-row"><label class="spy-settings-label">地图自动重绘间隔(0关闭)</label><input type="number" id="setMapInt" class="spy-settings-input" value="${s.mapInterval}" min="0"></div><div style="display:flex;gap:10px;margin-top:20px;"><button onclick="document.getElementById('spySettingsModal').classList.remove('show')" style="flex:1;padding:10px;background:#f5f5f5;border:none;border-radius:8px;">取消</button><button onclick="window.saveAdvancedSpySettings()" style="flex:1;padding:10px;background:#000;color:#fff;border:none;border-radius:8px;">保存</button></div>`;
    m.classList.add('show');
};

window.saveAdvancedSpySettings = function() {
    const f=friends.find(x=>x.id===window.spyState.friendId);
    f.spySettings={
        mapCount:parseInt(document.getElementById('setMapCount').value),
        logInterval:parseInt(document.getElementById('setLogInt').value),
        weatherInterval:parseInt(document.getElementById('setWeatherInt').value),
        luckInterval:parseInt(document.getElementById('setLuckInt').value),
        mapInterval:parseInt(document.getElementById('setMapInt').value)
    };
    saveData();
    document.getElementById('spySettingsModal').classList.remove('show');
    alert("设置已保存！");
};
// ===============================================
// 【最终修复版 V2】 按钮逻辑 + 设置联动 + 自动检查
// ===============================================

// 1. 强行绑定函数 (保持之前的修复，确保能点击)
window.rebindSpyButtons = function() {
    // 绑定重绘按钮
    const btnRedraw = document.getElementById('js-btn-redraw');
    if (btnRedraw) {
        const newBtn = btnRedraw.cloneNode(true);
        btnRedraw.parentNode.replaceChild(newBtn, btnRedraw);
        newBtn.addEventListener('click', (e) => { e.stopPropagation(); window.spy_triggerRedraw(newBtn); });
        newBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); window.spy_triggerRedraw(newBtn); });
    }
    // 绑定天气按钮
    const btnWeather = document.getElementById('js-btn-weather');
    if (btnWeather) {
        const newBtn = btnWeather.cloneNode(true);
        btnWeather.parentNode.replaceChild(newBtn, btnWeather);
        newBtn.addEventListener('click', (e) => { e.stopPropagation(); window.spy_triggerWeather(newBtn); });
        newBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); window.spy_triggerWeather(newBtn); });
    }
    // 绑定添加按钮
    const btnAdd = document.getElementById('js-btn-add');
    if (btnAdd) {
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.onclick = (e) => { e.stopPropagation(); window.startAddLocationMode(); };
    }
    // 绑定刷新按钮
    const btnRefresh = document.getElementById('js-btn-refresh');
    if (btnRefresh) {
        const newBtn = btnRefresh.cloneNode(true);
        btnRefresh.parentNode.replaceChild(newBtn, btnRefresh);
        newBtn.onclick = (e) => { e.stopPropagation(); window.forceRefreshLogs(true); };
    }
};

// 2. 【重绘逻辑】 (已连接：地点数量设置)
window.spy_triggerRedraw = async function(btnElement) {
    if(confirm("确定要让 AI 重新规划所有地点吗？旧坐标将丢失。") === false) return;

    if(btnElement) {
        btnElement.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> <span>生成中</span>';
        btnElement.style.opacity = '0.7';
    }

    try {
        const friend = friends.find(f => f.id === window.spyState.friendId);
        if(!friend) throw new Error("未找到好友数据");

        // === 读取设置 ===
        // 如果没有设置，默认生成 8 个
        const mapCount = (friend.spySettings && friend.spySettings.mapCount) ? friend.spySettings.mapCount : 8;

        const settings = await dbManager.get('apiSettings', 'settings');
        if (!settings) throw new Error("请先配置 API 设置");

        // 在 Prompt 中动态插入 mapCount
        const prompt = `为虚拟角色"${friend.name}"生成 ${mapCount} 个常去的城市地点坐标(x,y在10-90之间)。返回纯JSON数组: [{"name":"地点名","type":"leisure","x":50,"y":50,"desc":"简短描述"}]`;

        showToast(`正在规划 ${mapCount} 个地点...`);

        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);

        if(jsonMatch) {
            const newLocs = JSON.parse(jsonMatch[0]);
            // 补全坐标
            newLocs.forEach(l => {
                if(!l.x) l.x = Math.random() * 80 + 10;
                if(!l.y) l.y = Math.random() * 80 + 10;
            });
            friend.mapLocations = newLocs;
            friend.lastMapTime = new Date().toISOString(); // 记录生成时间
            await saveData();

            if(window.renderSpyUI) window.renderSpyUI();
            showToast("地图重绘成功！");
        } else {
            throw new Error("AI 返回格式错误");
        }

    } catch(e) {
        alert("重绘失败: " + e.message);
        console.error(e);
    } finally {
        if(btnElement) {
            btnElement.innerHTML = '<i class="ri-map-2-line"></i> <span>重绘</span>';
            btnElement.style.opacity = '1';
        }
        setTimeout(window.rebindSpyButtons, 100);
    }
};


// 3. 【天气逻辑】 (已连接：更新间隔设置)
window.spy_triggerWeather = async function(btnElement) {
    if(btnElement) btnElement.innerHTML = '<i class="ri-loader-4-line fa-spin"></i> <span>查询</span>';

    try {
        const friend = friends.find(f => f.id === window.spyState.friendId);
        const city = (friend.citySettings && friend.citySettings.realCity) ? friend.citySettings.realCity : "Beijing";

        // === 读取设置 ===
        // 默认间隔 4 小时
        const intervalHours = (friend.spySettings && friend.spySettings.weatherInterval) ? friend.spySettings.weatherInterval : 4;
        const now = Date.now();

        // 检查缓存
        let useCache = false;
        if (friend.weatherCache && friend.weatherCache.lastUpdateTime) {
            const lastTime = new Date(friend.weatherCache.lastUpdateTime).getTime();
            const hoursDiff = (now - lastTime) / (1000 * 60 * 60);

            // 如果 距离上次更新时间 < 设置的间隔，且城市没变，则使用缓存
            if (hoursDiff < intervalHours && friend.weatherCache.city === city) {
                useCache = true;
                console.log(`【天气】使用缓存，距离上次更新才过了 ${hoursDiff.toFixed(1)} 小时 (设置间隔: ${intervalHours})`);
            }
        }

        const modal = document.getElementById('spyWeatherModal');
        if(modal) {
            modal.classList.add('show');
            const area = document.getElementById('weatherContentArea');

            if (useCache) {
                // 使用缓存数据渲染
                window.renderBWWeatherUI(friend.weatherCache.data);
            } else {
                // 重新请求
                if(area) area.innerHTML = '<div style="padding:40px; text-align:center;">正在同步气象卫星...</div>';

                const res = await fetch(`https://wttr.in/${city}?format=j1&lang=zh`);
                const data = await res.json();

                // 保存缓存
                friend.weatherCache = {
                    lastUpdateTime: new Date().toISOString(), // 记录精确时间
                    city: city,
                    data: data
                };
                await saveData();

                window.renderBWWeatherUI(data);
            }
        }
    } catch(e) {
        alert("天气获取失败: " + e.message);
    } finally {
        if(btnElement) btnElement.innerHTML = '<i class="ri-sun-cloudy-line"></i> <span>天气</span>';
    }
};


// 4. 【自动检查逻辑】 (已连接：运势间隔 & 地图自动间隔)
// 该函数会在 forceOpenSpyMap 中被调用
window.checkAllAutoUpdates = function(friend) {
    if (!friend || !friend.spySettings) return;

    const now = Date.now();

    // (A) 检查运势 (luckInterval 是分钟)
    const luckIntervalMin = friend.spySettings.luckInterval || 120; // 默认120分钟
    const lastLuck = friend.lastLuckTime ? new Date(friend.lastLuckTime).getTime() : 0;

    if ((now - lastLuck) > (luckIntervalMin * 60 * 1000)) {
        console.log("【自动】运势已过期，重新生成...");
        friend.luckValue = Math.floor(Math.random() * 100) + 1;
        friend.lastLuckTime = new Date().toISOString();
        // 保存数据
        saveData();
    }

    // (B) 检查地图 (mapInterval 是小时)
    // 0 表示关闭自动重绘
    const mapIntervalHour = friend.spySettings.mapInterval || 0;

    if (mapIntervalHour > 0) {
        const lastMap = friend.lastMapTime ? new Date(friend.lastMapTime).getTime() : 0;
        if ((now - lastMap) > (mapIntervalHour * 60 * 60 * 1000)) {
            console.log("【自动】地图已过期，触发重绘...");
            // 延迟一点执行，避免和页面加载冲突
            setTimeout(() => {
                window.spy_triggerRedraw(null); // null 表示不传按钮，静默或弹窗提示
            }, 1000);
        }
    }
};

// 辅助渲染天气UI (供 spy_triggerWeather 调用)
window.renderBWWeatherUI = function(data) {
    const cur = data.current_condition[0];
    const area = document.getElementById('weatherContentArea');
    if(area) {
        area.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <div style="font-size:40px; font-weight:bold; margin-bottom:10px;">${cur.temp_C}°C</div>
                <div style="font-size:18px; margin-bottom:5px;">${cur.lang_zh[0].value}</div>
                <div style="color:#666; font-size:12px;">
                    湿度: ${cur.humidity}% | 风速: ${cur.windspeedKmph}km/h | 能见度: ${cur.visibility}km
                </div>
            </div>
        `;
    }
};

window.showToast = function(msg) {
    const div = document.createElement('div');
    div.style.cssText = "position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:#fff; padding:10px 20px; border-radius:20px; z-index:10000; font-size:14px;";
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2000);
};

/**
 * [新增] 显示物品/小票弹窗
 * 动态创建DOM，不需要修改HTML文件
 */
function showBagModal(data) {
    // 1. 如果旧弹窗存在，先移除
    const oldModal = document.getElementById('spyBagModal');
    if (oldModal) oldModal.remove();

    // 2. 根据类型决定样式
    const isReceipt = data.type === 'receipt';

    // 生成列表 HTML
    const listHtml = data.items.map(item => `
        <div class="bag-item">
            <span class="bag-item-name">${item.name}</span>
            <span class="bag-item-desc">${item.desc}</span>
        </div>
    `).join('');

    // 3. 构建弹窗 HTML
    const modalHtml = `
    <div id="spyBagModal" class="bag-modal-overlay show" onclick="this.remove()">
        <div class="bag-card ${isReceipt ? 'style-receipt' : 'style-bag'}" onclick="event.stopPropagation()">
            <div class="bag-header">
                <div class="bag-icon">
                    <i class="${isReceipt ? 'ri-ticket-line' : 'ri-handbag-line'}"></i>
                </div>
                <div class="bag-title">${data.title}</div>
            </div>

            <div class="bag-divider"></div>

            <div class="bag-list">
                ${listHtml}
            </div>

            <div class="bag-footer">
                ${isReceipt ? 'TOTAL: --.--' : 'CHECKED'}
            </div>

            <!-- 锯齿装饰 (仅小票显示) -->
            ${isReceipt ? '<div class="receipt-jagged"></div>' : ''}
        </div>
    </div>
    `;

    // 4. 插入页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
/**
 * [保存版] 检查背包/小票功能
 * 逻辑：点击 -> 检查是否已生成 -> (有)直接显示 / (无)调用AI生成并保存
 */
window.checkSpyBag = async function(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    if (btn.classList.contains('loading')) return;

    // 1. 获取标识信息
    const time = btn.dataset.time; // 核心：获取这条动态的时间
    const summary = btn.dataset.summary;
    const detail = btn.dataset.detail;

    // 2. 获取好友信息
    const friend = friends.find(f => f.id === window.spyState.friendId);
    const settings = await dbManager.get('apiSettings', 'settings');

    if (!friend || !settings || !settings.apiUrl) {
        showToast("请先在设置中配置 API");
        return;
    }

    // 3. 【核心逻辑】检查是否已经生成过
    // 在 spyLogs 数组里找到对应时间的这一条日志
    const targetLog = friend.spyLogs.find(l => l.time === time);

    if (targetLog && targetLog.bagData) {
        // A. 如果已经有数据了，直接显示，不调API
        console.log("加载已保存的物品清单...");
        showBagModal(targetLog.bagData);
        return;
    }

    // --- 下面是生成逻辑 (B. 没有数据，开始生成) ---

    // 获取用户人设
    const personaId = friend.activeUserPersonaId || 'default_user';
    const persona = userPersonas.find(p => p.id === personaId) || userProfile;

    // UI 反馈
    btn.classList.add('loading');
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i>';

    const prompt = `
【任务】: 你是RPG游戏的物品生成器。请根据角色当前的【状态】和【人设】，生成一份TA此刻的【随身物品清单】或【消费小票】。

【角色信息】:
- 姓名: ${friend.name}
- 人设: ${friend.role}
- 关系人(用户): ${persona.name}

【当前状态】:
- 摘要: ${summary}
- 详情: ${detail}

【生成逻辑】:
1. **如果是消费场景** (吃饭/购物)：生成【收银小票】(包含价格)。
2. **如果是日常场景** (工作/休息)：生成【背包检查】(手机、钥匙、惊喜)。

【特殊要求】:
必须包含 1 件与用户(${persona.name})有关的物品。

【输出格式】:
只返回 JSON:
{
  "type": "receipt" 或 "bag",
  "title": "标题",
  "items": [
    { "name": "物品名", "desc": "备注或价格" }
  ]
}
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 1.0
            })
        });

        const data = await response.json();
        const contentStr = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);

            // --- 【核心修改】 保存数据 ---
            if (targetLog) {
                targetLog.bagData = result; // 将结果存入这条日志
                await saveData(); // 写入数据库
                console.log("物品清单已保存！");
            }

            showBagModal(result);
        } else {
            console.warn("JSON解析失败", contentStr);
            showToast("搜查失败，看不清。");
        }

    } catch (err) {
        console.error(err);
        showToast("网络连接失败");
    } finally {
        // 恢复按钮
        btn.classList.remove('loading');
        btn.innerHTML = originalIcon;
    }
};


/**
 * [新增] 显示物品/小票弹窗
 * 动态创建DOM，不需要修改HTML文件
 */
function showBagModal(data) {
    // 1. 如果旧弹窗存在，先移除
    const oldModal = document.getElementById('spyBagModal');
    if (oldModal) oldModal.remove();

    // 2. 根据类型决定样式
    const isReceipt = data.type === 'receipt';

    // 生成列表 HTML
    const listHtml = data.items.map(item => `
        <div class="bag-item">
            <span class="bag-item-name">${item.name}</span>
            <span class="bag-item-desc">${item.desc}</span>
        </div>
    `).join('');

    // 3. 构建弹窗 HTML
    const modalHtml = `
    <div id="spyBagModal" class="bag-modal-overlay show" onclick="this.remove()">
        <div class="bag-card ${isReceipt ? 'style-receipt' : 'style-bag'}" onclick="event.stopPropagation()">
            <div class="bag-header">
                <div class="bag-icon">
                    <i class="${isReceipt ? 'ri-ticket-line' : 'ri-handbag-line'}"></i>
                </div>
                <div class="bag-title">${data.title}</div>
            </div>

            <div class="bag-divider"></div>

            <div class="bag-list">
                ${listHtml}
            </div>

            <div class="bag-footer">
                ${isReceipt ? 'TOTAL: --.--' : 'CHECKED'}
            </div>

            <!-- 锯齿装饰 (仅小票显示) -->
            ${isReceipt ? '<div class="receipt-jagged"></div>' : ''}
        </div>
    </div>
    `;

    // 4. 插入页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// =========================================================
// 【小白修复补丁】5个按钮的具体功能实现
// =========================================================

// 1. 添加地点
window.spyBtnAdd = function(btn) {
    // 阻止冒泡，防止点到地图
    if(event) event.stopPropagation();
    // 调用原有的添加逻辑
    window.startAddLocationMode();
};

// 2. 天气查询
window.spyBtnWeather = function(btn) {
    if(event) event.stopPropagation();
    // 简单的加载动画
    const icon = btn.querySelector('i');
    const oldClass = icon.className;
    icon.className = 'ri-loader-4-line fa-spin'; // 转圈

    // 调用原有天气逻辑
    if(typeof window.spy_triggerWeather === 'function') {
        window.spy_triggerWeather(null).then(() => {
            // 恢复图标
            icon.className = oldClass;
        });
    } else {
        // 备用方案
        openSpyWeatherModal();
        setTimeout(() => icon.className = oldClass, 1000);
    }
};

// 3. 重绘地图
window.spyBtnRedraw = function(btn) {
    if(event) event.stopPropagation();
    // 调用原有重绘逻辑
    if(typeof window.spy_triggerRedraw === 'function') {
        window.spy_triggerRedraw(btn); // 传入btn以便显示加载状态
    } else {
        generateMapFromAI();
    }
};

// 4. 刷新动态
window.spyBtnRefresh = function(btn) {
    if(event) event.stopPropagation();

    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin'); // 旋转

    // 调用原有刷新逻辑
    if(typeof window.forceRefreshLogs === 'function') {
        window.forceRefreshLogs(true).then(() => {
            icon.classList.remove('fa-spin');
        });
    } else {
        refreshSpyLogs(null, true).then(() => {
            icon.classList.remove('fa-spin');
        });
    }
};

// 5. 高级设置 (新增加的第5个按钮)
window.spyBtnSettings = function(btn) {
    if(event) event.stopPropagation();
    // 调用设置弹窗
    if(typeof window.openAdvancedSpySettings === 'function') {
        window.openAdvancedSpySettings();
    } else {
        alert("设置功能暂未加载，请检查代码。");
    }
};
// =========================================================
// 【小白终极修复】地图全能控制器 (添加 + 移动 + 缩放)
// =========================================================

// 全局变量：确保状态统一
window.superMapState = {
    scale: 1,
    panning: false,
    pointX: 0, pointY: 0, // 当前偏移量
    startX: 0, startY: 0, // 拖拽起始点
    isAdding: false       // 是否正在添加地点
};

/**
 * 1. 初始化地图交互 (每次打开地图时必须调用)
 * 把它绑定到 window 上，确保哪里都能调用
 */
window.initSuperMapInteraction = function() {
    const container = document.getElementById('spyEmbeddedMap');
    const layer = document.getElementById('spyMapMovableLayer');
    if (!container || !layer) return;

    // 重置状态
    window.superMapState = { scale: 1, panning: false, pointX: 0, pointY: 0, startX: 0, startY: 0, isAdding: false };
    layer.style.transform = `translate(0px, 0px) scale(1)`;

    // --- 移除旧监听器 (防止重复) ---
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    // 重新获取 DOM (因为 cloneNode 替换了)
    const mapEl = document.getElementById('spyEmbeddedMap');

    // 插入一个提示条 (如果还没有的话)
    if (!document.getElementById('addLocationTip')) {
        const tip = document.createElement('div');
        tip.id = 'addLocationTip';
        tip.innerText = "请点击地图任意位置添加地点";
        mapEl.appendChild(tip);
    }

    // ============================
    // 核心事件绑定
    // ============================

    // 1. 按下 (开始拖拽 或 准备点击)
    const onStart = (e) => {
        // 如果点的是按钮或气泡，忽略
        if (e.target.closest('.map-fab') || e.target.closest('.map-info-bubble') || e.target.closest('.luck-dashboard')) return;

        window.superMapState.panning = true;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        window.superMapState.startX = clientX - window.superMapState.pointX;
        window.superMapState.startY = clientY - window.superMapState.pointY;
    };

    // 2. 移动 (拖拽地图)
    const onMove = (e) => {
        if (!window.superMapState.panning) return;
        e.preventDefault(); // 防止手机滚屏

        // 如果是双指缩放，暂不处理 (简单版只做单指拖拽，防冲突)
        if (e.touches && e.touches.length > 1) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        window.superMapState.pointX = clientX - window.superMapState.startX;
        window.superMapState.pointY = clientY - window.superMapState.startY;

        updateTransform();
    };

    // 3. 抬起 (结束拖拽 或 触发点击)
    const onEnd = (e) => {
        window.superMapState.panning = false;
    };

    // 4. 点击事件 (专门处理添加逻辑)
    // 注意：我们用 onclick 而不是 onmouseup，确保是点击动作
    mapEl.onclick = async (e) => {
        // 如果不是添加模式，或者是拖拽后的释放，忽略
        if (!window.superMapState.isAdding) return;
        if (e.target.closest('.map-fab')) return;

        // 计算点击位置的百分比坐标
        const rect = mapEl.getBoundingClientRect();

        // 修正：需要减去当前的偏移量，还要除以缩放比例，算出在原始图层上的位置
        const clickX = e.clientX - rect.left - window.superMapState.pointX;
        const clickY = e.clientY - rect.top - window.superMapState.pointY;

        const percentX = (clickX / (rect.width * window.superMapState.scale)) * 100;
        const percentY = (clickY / (rect.height * window.superMapState.scale)) * 100;

        // 执行添加
        await window.executeAddLocation(percentX, percentY);
    };

    // 5. 滚轮缩放 (电脑端)
    mapEl.onwheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        let newScale = window.superMapState.scale + delta;
        newScale = Math.min(Math.max(0.5, newScale), 3); // 限制 0.5 - 3倍
        window.superMapState.scale = newScale;
        updateTransform();
    };

    // 绑定事件
    mapEl.addEventListener('mousedown', onStart);
    mapEl.addEventListener('touchstart', onStart, { passive: false });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    // 内部更新函数
    function updateTransform() {
        const l = document.getElementById('spyMapMovableLayer');
        if(l) l.style.transform = `translate(${window.superMapState.pointX}px, ${window.superMapState.pointY}px) scale(${window.superMapState.scale})`;
    }
};

/**
 * 2. 点击“添加”按钮触发的函数
 */
window.startAddLocationMode = function() {
    window.superMapState.isAdding = true;

    // UI 反馈
    const mapEl = document.getElementById('spyEmbeddedMap');
    mapEl.classList.add('adding-mode');

    const tip = document.getElementById('addLocationTip');
    if(tip) tip.classList.add('show');

    // 隐藏气泡
    window.hideMapPopup();

    if(typeof showToast === 'function') showToast("点击地图任意空白处即可添加");
};

/**
 * 3. 执行添加保存逻辑
 */
window.executeAddLocation = async function(x, y) {
    // 1. 退出添加模式
    window.superMapState.isAdding = false;
    document.getElementById('spyEmbeddedMap').classList.remove('adding-mode');
    document.getElementById('addLocationTip').classList.remove('show');

    // 2. 弹出输入框
    // 优先使用自定义输入框，如果没有则用 prompt
    let name = null;
    if (typeof openNameInputModal === 'function') {
        openNameInputModal("请输入地点名称 (如: 秘密基地)", async (val) => {
            if (val) await saveLocationToDB(val, x, y);
        });
    } else {
        name = prompt("请输入地点名称:");
        if (name) await saveLocationToDB(name, x, y);
    }
};

/**
 * 4. 写入数据库
 */
async function saveLocationToDB(name, x, y) {
    const friend = friends.find(f => f.id === window.spyState.friendId || f.id === currentChatFriendId);
    if (!friend) return alert("错误：找不到当前角色数据");

    if (!friend.mapLocations) friend.mapLocations = [];

    // 添加新数据
    friend.mapLocations.push({
        name: name,
        type: 'leisure', // 默认为休闲场所
        desc: '自定义添加的地点',
        x: x, // 百分比坐标
        y: y
    });

    await saveData(); // 保存

    // 刷新 UI
    if (window.renderSpyUI) window.renderSpyUI();

    if(typeof showToast === 'function') showToast("地点添加成功！");
}

/**
 * 5. 劫持旧的地图打开函数，强行注入我们的新逻辑
 */
const originalForceOpen = window.forceOpenSpyMap;
window.forceOpenSpyMap = function() {
    // 调用原逻辑打开界面
    if (originalForceOpen) originalForceOpen();

    // 延迟 300ms (等弹窗动画结束) 后，强行初始化我们的控制器
    setTimeout(() => {
        window.initSuperMapInteraction();

        // 重新绑定按钮 (防止被覆盖)
        window.rebindSpyButtons();
    }, 300);
};
