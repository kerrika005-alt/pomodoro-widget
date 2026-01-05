// Notion設定（GitHub Secretsから自動挿入）
const NOTION_API_KEY = 'YOUR_NOTION_API_KEY_HERE';
const NOTION_DATABASE_ID = 'YOUR_DATABASE_ID_HERE';

// タイマーの状態管理
let timerState = {
    isRunning: false,
    isPaused: false,
    currentTime: 25 * 60, // 秒
    totalTime: 25 * 60,
    isWorkPhase: true,
    currentSet: 1,
    totalSets: 1,
    workDuration: 25,
    breakDuration: 5,
    selectedCategory: '',
    completedSets: 0,
    startTime: null
};

let timerInterval = null;

// DOM要素の取得
const categorySelect = document.getElementById('categorySelect');
const setsInput = document.getElementById('setsInput');
const decrementSets = document.getElementById('decrementSets');
const incrementSets = document.getElementById('incrementSets');
const remainingSets = document.getElementById('remainingSets');
const workDurationInput = document.getElementById('workDuration');
const breakDurationInput = document.getElementById('breakDuration');
const timeDisplay = document.getElementById('timeDisplay');
const phaseDisplay = document.getElementById('phaseDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const statusBox = document.getElementById('statusBox');
const timerCircle = document.getElementById('timerCircle');
const progressFill = document.getElementById('progressFill');
const completedSetsDisplay = document.getElementById('completedSets');
const totalSetsDisplay = document.getElementById('totalSets');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const refreshBtn = document.getElementById('refreshBtn');
const dateFilter = document.getElementById('dateFilter');

// 設定
const soundToggle = document.getElementById('soundToggle');
const notificationToggle = document.getElementById('notificationToggle');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateDisplay();
});

// イベントリスナーの設定
function setupEventListeners() {
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    decrementSets.addEventListener('click', () => changeSetCount(-1));
    incrementSets.addEventListener('click', () => changeSetCount(1));
    setsInput.addEventListener('change', updateSetCount);
    
    workDurationInput.addEventListener('change', updateDuration);
    breakDurationInput.addEventListener('change', updateDuration);
    
    // タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
            
            if (e.target.dataset.tab === 'dashboard') {
                loadDashboard();
            }
        });
    });
    
    // ダッシュボード
    refreshBtn.addEventListener('click', loadDashboard);
    dateFilter.addEventListener('change', loadDashboard);
}

// セット数の変更
function changeSetCount(delta) {
    let newCount = Math.max(1, Math.min(10, timerState.totalSets + delta));
    setsInput.value = newCount;
    updateSetCount();
}

function updateSetCount() {
    timerState.totalSets = parseInt(setsInput.value) || 1;
    remainingSets.textContent = timerState.totalSets - timerState.completedSets;
    totalSetsDisplay.textContent = timerState.totalSets;
}

// 時間の更新
function updateDuration() {
    timerState.workDuration = parseInt(workDurationInput.value) || 25;
    timerState.breakDuration = parseInt(breakDurationInput.value) || 5;
    
    if (!timerState.isRunning) {
        timerState.currentTime = timerState.isWorkPhase ? 
            timerState.workDuration * 60 : 
            timerState.breakDuration * 60;
        timerState.totalTime = timerState.currentTime;
        updateDisplay();
    }
}

// タイマースタート
function startTimer() {
    if (!timerState.selectedCategory) {
        alert('📂 カテゴリーを選択してください！');
        return;
    }
    
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        timerState.startTime = new Date();
        
        // ボタン状態の更新
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        categorySelect.disabled = true;
        setsInput.disabled = true;
        workDurationInput.disabled = true;
        breakDurationInput.disabled = true;
        
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// タイマー更新
function updateTimer() {
    timerState.currentTime--;
    
    if (timerState.currentTime < 0) {
        // フェーズ完了
        if (timerState.isWorkPhase) {
            timerState.completedSets++;
            playNotificationSound();
            
            if (timerState.completedSets >= timerState.totalSets) {
                // 全セット完了
                clearInterval(timerInterval);
                timerState.isRunning = false;
                saveToNotion();
                showCompletionMessage();
                resetUI();
            } else {
                // 休憩フェーズへ
                switchToBreak();
            }
        } else {
            // 作業フェーズへ
            switchToWork();
        }
    }
    
    updateDisplay();
}

// 作業フェーズに切り替え
function switchToWork() {
    timerState.isWorkPhase = true;
    timerState.currentTime = timerState.workDuration * 60;
    timerState.totalTime = timerState.currentTime;
}

// 休憩フェーズに切り替え
function switchToBreak() {
    timerState.isWorkPhase = false;
    timerState.currentTime = timerState.breakDuration * 60;
    timerState.totalTime = timerState.currentTime;
}

// 一時停止
function pauseTimer() {
    if (timerState.isRunning) {
        timerState.isRunning = false;
        timerState.isPaused = true;
        clearInterval(timerInterval);
        startBtn.textContent = '再開';
        pauseBtn.textContent = '一時停止解除';
    } else if (timerState.isPaused) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        startBtn.textContent = 'スタート';
        pauseBtn.textContent = '一時停止';
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// リセット
function resetTimer() {
    clearInterval(timerInterval);
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.currentSet = 1;
    timerState.completedSets = 0;
    timerState.isWorkPhase = true;
    timerState.currentTime = timerState.workDuration * 60;
    timerState.totalTime = timerState.currentTime;
    
    resetUI();
    updateDisplay();
}

function resetUI() {
    startBtn.disabled = false;
    startBtn.textContent = 'スタート';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '一時停止';
    categorySelect.disabled = false;
    setsInput.disabled = false;
    workDurationInput.disabled = false;
    breakDurationInput.disabled = false;
}

// 表示の更新
function updateDisplay() {
    // 時間表示
    const minutes = Math.floor(timerState.currentTime / 60);
    const seconds = timerState.currentTime % 60;
    timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // フェーズ表示
    if (timerState.isWorkPhase) {
        phaseDisplay.textContent = '集中時間';
        statusBox.textContent = '🔥 集中時間です！';
        statusBox.classList.add('working');
        statusBox.classList.remove('breaking');
        timerCircle.style.background = 'linear-gradient(135deg, #ff6b6b, #ff8787)';
    } else {
        phaseDisplay.textContent = '休憩時間';
        statusBox.textContent = '☕ 休憩時間です！';
        statusBox.classList.add('breaking');
        statusBox.classList.remove('working');
        timerCircle.style.background = 'linear-gradient(135deg, #4ecdc4, #44a08d)';
    }
    
    // 進捗バー
    const progress = ((timerState.totalTime - timerState.currentTime) / timerState.totalTime) * 100;
    progressFill.style.width = `${progress}%`;
    
    // セット表示
    completedSetsDisplay.textContent = timerState.completedSets;
    totalSetsDisplay.textContent = timerState.totalSets;
    remainingSets.textContent = timerState.totalSets - timerState.completedSets;
}

// カテゴリー選択の監視
categorySelect.addEventListener('change', (e) => {
    timerState.selectedCategory = e.target.value;
});

// 音声通知
function playNotificationSound() {
    if (soundToggle.checked) {
        // 簡単なビープ音を生成
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
}

// 完了メッセージ
function showCompletionMessage() {
    alert(`🎉 完了！${timerState.completedSets}セットの集中が終わりました！\n\n集計: ${timerState.selectedCategory}\n総時間: ${timerState.completedSets * timerState.workDuration}分`);
}

// Notionに保存
async function saveToNotion() {
    if (!notificationToggle.checked) return;
    
    try {
        const totalWorkTime = timerState.completedSets * timerState.workDuration;
        const now = new Date();
        
        const pageData = {
            parent: {
                database_id: NOTION_DATABASE_ID
            },
            properties: {
                "Title": {
                    "title": [
                        {
                            "text": {
                                "content": `${now.toLocaleDateString('ja-JP')} ${timerState.selectedCategory}`
                            }
                        }
                    ]
                },
                "Start Time": {
                    "date": {
                        "start": now.toISOString()
                    }
                },
                "Sets": {
                    "number": timerState.completedSets
                },
                "Work Duration": {
                    "number": timerState.workDuration
                },
                "Break Duration": {
                    "number": timerState.breakDuration
                },
                "Category": {
                    "select": {
                        "name": timerState.selectedCategory
                    }
                }
            }
        };
        
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(pageData)
        });
        
        if (response.ok) {
            console.log('✅ Notionに保存されました！');
        } else {
            console.error('Notion保存エラー:', response.status);
        }
    } catch (error) {
        console.error('Notion連携エラー:', error);
    }
}

// ダッシュボード読み込み
async function loadDashboard() {
    try {
        const filter = dateFilter.value;
        const now = new Date();
        let startDate = new Date();
        
        switch(filter) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                const day = now.getDay();
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'all':
                startDate = new Date(2020, 0, 1);
                break;
        }
        
        const queryData = {
            filter: {
                property: "Start Time",
                date: {
                    after: startDate.toISOString()
                }
            },
            sorts: [
                {
                    property: "Start Time",
                    direction: "descending"
                }
            ]
        };
        
        const response = await fetch(
            `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NOTION_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify(queryData)
            }
        );
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        updateDashboardDisplay(data.results);
    } catch (error) {
        console.error('ダッシュボード読み込みエラー:', error);
        document.getElementById('categoryStats').innerHTML = 
            '<p class="loading">❌ データの読み込みに失敗しました</p>';
    }
}

// ダッシュボード表示を更新
function updateDashboardDisplay(results) {
    // 統計の計算
    let totalSets = 0;
    let totalMinutes = 0;
    const categoryStats = {};
    const logs = [];
    
    results.forEach(page => {
        const props = page.properties;
        
        const sets = props.Sets?.number || 0;
        const workDuration = props["Work Duration"]?.number || 0;
        const category = props.Category?.select?.name || '未分類';
        const startTime = props["Start Time"]?.date?.start;
        const title = props.Title?.title?.[0]?.plain_text || '';
        
        totalSets += sets;
        totalMinutes += sets * workDuration;
        
        if (!categoryStats[category]) {
            categoryStats[category] = { sets: 0, minutes: 0 };
        }
        categoryStats[category].sets += sets;
        categoryStats[category].minutes += sets * workDuration;
        
        logs.push({
            time: new Date(startTime).toLocaleString('ja-JP'),
            category: category,
            sets: sets,
            duration: sets * workDuration
        });
    });
    
    // 統計表示
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    document.getElementById('totalHours').textContent = 
        hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    document.getElementById('totalSetsCompleted').textContent = totalSets;
    document.getElementById('sessionCount').textContent = results.length;
    
    // カテゴリー別表示
    const categoryStatsHtml = Object.entries(categoryStats)
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .map(([category, stats]) => `
            <div class="category-item">
                <div class="category-name">${category}</div>
                <div class="category-info">
                    <span>セット: ${stats.sets}</span>
                    <span>時間: ${Math.floor(stats.minutes / 60)}h ${stats.minutes % 60}m</span>
                </div>
            </div>
        `).join('');
    
    document.getElementById('categoryStats').innerHTML = 
        categoryStatsHtml || '<p class="loading">データはまだありません</p>';
    
    // ログ表示
    const logsHtml = logs.slice(0, 10).map(log => `
        <div class="log-item">
            <div class="log-time">${log.time}</div>
            <span class="log-category">${log.category}</span>
            <div style="margin-top: 6px; color: #666;">
                ${log.sets}セット (${log.duration}分)
            </div>
        </div>
    `).join('');
    
    document.getElementById('detailedLog').innerHTML = 
        logsHtml || '<p class="loading">ログはまだありません</p>';
}
