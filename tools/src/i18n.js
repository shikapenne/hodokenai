// ===== languages =====
// ja / en / zh-Hans / zh-Hant / ko. Picked from the phone's language, changeable on the title screen.
const STRINGS = {
  ja: {
    sub: '絡まったネックレスをほどくパズル',
    lead: '引き出しの奥で絡まったネックレスを、ほどくゲームです。結び目は、焦って引くほど固く締まります。',
    rulesTouch: '<div><b>つまむ</b>　鎖に触れて、そのまま引く。つまんだ所はふわっと持ち上がり、ほかの鎖の上を越えられます。</div><div><b>押さえる</b>　鎖を二本の指で。片方で押さえて、もう片方で引く。</div><div><b>視点</b>　何もない所をなぞると移動。二本指でピンチすると拡大縮小、ひねると回転、そろえて上下になぞると傾き。</div><div><b>ゴール</b>　ほどけたネックレスは、両端の留め具が光ります。片方の端をつまんで、もう片方の端に重ねると輪になって完成。絡まったままでは輪にできません。全部完成させればクリア。</div>',
    rulesPC: '<div><b>つまむ</b>　鎖をクリックして引く。つまんだ所はふわっと持ち上がり、ほかの鎖の上を越えられます。</div><div><b>押さえる</b>　右クリックで押さえたまま、左クリックで引く（スマホは二本指）。</div><div><b>視点</b>　何もない所をドラッグで移動、ホイールで拡大縮小、右ドラッグで回転と傾き。</div><div><b>ゴール</b>　ほどけたネックレスは、両端の留め具が光ります。片方の端をつまんで、もう片方の端に重ねると輪になって完成。絡まったままでは輪にできません。全部完成させればクリア。</div>',
    lang: '言語', board: 'ランキングを見る', pause: 'ポーズ', resume: 'つづける', soundOn: '音 オン', soundOff: '音 オフ',
    howTo: '遊び方', startPlay: 'はじめる', locked: '未開放', retry: '最初から', levels: 'レベル選択', ranking: 'ランキング', close: '閉じる', view: '視点を戻す',
    cross: '交差', time: '時間', cleared: 'ほどけた', next: '次のレベル', post: 'Xにポスト',
    nameLabel: 'ランキングに載せる名前', namePh: '12文字まで', register: '登録', tray: '絡まったネックレスのトレイ',
    toastStart: '結び目は、引くほど締まります', toastFreed: n => `できた！　あと ${n} 本`, toastAll: 'ぜんぶ、ほどけた', toastClasp: 'ほどけた！ 端と端をくっつけて輪にしよう', stillTangled: 'まだ絡まっています',
    newBest: '自己ベスト', fastest: t => `最速 ${t}`, notCleared: '未クリア', untangled: name => `${name}をほどきました。`,
    rankPrompt: '名前を入れると全国ランキングに載ります。', rankSending: 'ランキングに登録しています…',
    rankResult: (r, n) => `全国 <b>${r}</b> 位 ／ ${n} 人中`, rankBestNote: t => `（あなたのベスト ${t} の順位）`,
    rankError: 'ランキングに接続できませんでした。電波のよい所で、もう一度クリアすると登録されます。',
    nameRejected: 'その名前は使えません。別の名前にしてください。',
    loading: '読み込み中…', boardEmpty: 'まだ記録がありません。最初の一人になれます。', boardError: 'ランキングに接続できませんでした。',
    shareText: (name, t) => `絡まったネックレスをほどくゲーム「ほどけない」\n${name}を ${t} でほどいた`, shareRank: (r, n) => `（全国 ${r} 位／${n} 人中）`, tags: '#ほどけない',
    levelNames: { L1: ['一本', '長い金の一本。自分自身に何度も結ばれている'], L2: ['二本', '金と銀が、互いの結び目に入り込んでいる'], L3: ['真珠', '粒の連なりは、意外と引っかかる'], L4: ['三本', '引き出しの奥から出てきた塊'], L5: ['五本', '地獄。焦らないこと'] },
  },
  en: {
    sub: 'A puzzle of tangled necklaces',
    lead: 'Necklaces knotted together at the back of a drawer. Untangle them. The harder you pull, the tighter the knots get.',
    rulesTouch: '<div><b>Pinch</b>　Touch a chain and pull. It lifts gently, so you can carry it over other chains.</div><div><b>Hold</b>　Use two fingers: one holds a chain down, the other pulls.</div><div><b>Camera</b>　Drag on empty velvet to move. Pinch to zoom, twist to rotate, slide two fingers up or down to tilt.</div><div><b>Goal</b>　When a necklace is free, the clasps at both ends glow. Pick up one end and bring it to the other to close the loop. A tangled necklace won’t close. Close them all to clear the level.</div>',
    rulesPC: '<div><b>Pinch</b>　Click a chain and drag. It lifts gently, so you can carry it over other chains.</div><div><b>Hold</b>　Right-click to hold a chain down while you drag another with the left button.</div><div><b>Camera</b>　Drag empty velvet to move, scroll to zoom, right-drag to rotate and tilt.</div><div><b>Goal</b>　When a necklace is free, the clasps at both ends glow. Pick up one end and bring it to the other to close the loop. A tangled necklace won’t close. Close them all to clear the level.</div>',
    lang: 'Language', board: 'Leaderboard', pause: 'Paused', resume: 'Resume', soundOn: 'Sound on', soundOff: 'Sound off',
    howTo: 'How to play', startPlay: 'Start', locked: 'Locked', retry: 'Restart', levels: 'Levels', ranking: 'Leaderboard', close: 'Close', view: 'Reset view',
    cross: 'CROSSINGS', time: 'TIME', cleared: 'Untangled', next: 'Next level', post: 'Post on X',
    nameLabel: 'Name for the leaderboard', namePh: 'Up to 12 characters', register: 'Submit', tray: 'Tray of tangled necklaces',
    toastStart: 'The harder you pull, the tighter the knot', toastFreed: n => `Done! ${n} to go`, toastAll: 'All untangled', toastClasp: 'Free! Bring the two ends together to close it', stillTangled: 'Still tangled',
    newBest: 'New best', fastest: t => `Best ${t}`, notCleared: 'Not cleared', untangled: name => `You untangled “${name}”.`,
    rankPrompt: 'Enter a name to join the worldwide leaderboard.', rankSending: 'Submitting your time…',
    rankResult: (r, n) => `Rank <b>${r}</b> of ${n}`, rankBestNote: t => `(rank of your best, ${t})`,
    rankError: 'Couldn’t reach the leaderboard. Your time is saved next time you clear it with a connection.',
    nameRejected: 'That name can’t be used. Please choose another.',
    loading: 'Loading…', boardEmpty: 'No times yet. Be the first.', boardError: 'Couldn’t reach the leaderboard.',
    shareText: (name, t) => `I untangled “${name}” in ${t} in HODOKENAI, the tangled necklace puzzle`, shareRank: (r, n) => ` (rank ${r} of ${n})`, tags: '#hodokenai #ほどけない',
    levelNames: { L1: ['One', 'One long gold chain, knotted into itself again and again'], L2: ['Two', 'Gold and silver, each caught inside the other’s knots'], L3: ['Pearls', 'A string of beads snags more than you’d think'], L4: ['Three', 'A lump from the back of the drawer'], L5: ['Five', 'Pure torment. Take your time'] },
  },
  'zh-Hans': {
    sub: '解开缠绕项链的解谜游戏',
    lead: '抽屉深处缠成一团的项链，把它们一条条解开吧。越是用力拉，结就系得越紧。',
    rulesTouch: '<div><b>抓起</b>　按住链子直接拖动。被抓起的地方会轻轻抬起，可以越过其他链子。</div><div><b>按住</b>　用两根手指：一根按住链子，另一根拖动。</div><div><b>视角</b>　在空白处滑动可移动；双指捏合缩放，扭转旋转，双指同时上下滑动可倾斜。</div><div><b>目标</b>　项链解开后，两端的扣环会发光。抓起一端，放到另一端上，就能扣成一圈。还缠着的项链扣不上。全部扣好即通关。</div>',
    rulesPC: '<div><b>抓起</b>　点击链子并拖动。被抓起的地方会轻轻抬起，可以越过其他链子。</div><div><b>按住</b>　右键按住一条链子，同时用左键拖动另一条。</div><div><b>视角</b>　拖动空白处移动，滚轮缩放，右键拖动旋转和倾斜。</div><div><b>目标</b>　项链解开后，两端的扣环会发光。抓起一端，放到另一端上，就能扣成一圈。还缠着的项链扣不上。全部扣好即通关。</div>',
    lang: '语言', board: '查看排行榜', pause: '暂停', resume: '继续', soundOn: '声音 开', soundOff: '声音 关',
    howTo: '玩法', startPlay: '开始', locked: '未解锁', retry: '重新开始', levels: '选择关卡', ranking: '排行榜', close: '关闭', view: '重置视角',
    cross: '交叉', time: '时间', cleared: '解开了', next: '下一关', post: '分享到 X',
    nameLabel: '排行榜上显示的名字', namePh: '最多12个字', register: '登记', tray: '缠绕项链的托盘',
    toastStart: '越拉，结越紧', toastFreed: n => `扣好了！还剩 ${n} 条`, toastAll: '全部解开了', toastClasp: '解开了！把两端扣在一起', stillTangled: '还缠着呢',
    newBest: '个人最佳', fastest: t => `最快 ${t}`, notCleared: '未通关', untangled: name => `解开了「${name}」。`,
    rankPrompt: '输入名字即可登上全球排行榜。', rankSending: '正在登记成绩…',
    rankResult: (r, n) => `第 <b>${r}</b> 名 ／ 共 ${n} 人`, rankBestNote: t => `（你的最佳成绩 ${t} 的排名）`,
    rankError: '无法连接排行榜。在网络良好的地方再次通关即可登记。',
    nameRejected: '这个名字不能使用，请换一个。',
    loading: '加载中…', boardEmpty: '还没有记录，来当第一名吧。', boardError: '无法连接排行榜。',
    shareText: (name, t) => `在解开缠绕项链的游戏「ほどけない」中\n用 ${t} 解开了「${name}」`, shareRank: (r, n) => `（第 ${r} 名／共 ${n} 人）`, tags: '#ほどけない #hodokenai',
    levelNames: { L1: ['一条', '一条长长的金链，自己缠了一个又一个结'], L2: ['两条', '金链与银链，彼此钻进对方的结里'], L3: ['珍珠', '一串珠子，意外地容易卡住'], L4: ['三条', '从抽屉深处翻出来的一团'], L5: ['五条', '地狱。千万别急'] },
  },
  'zh-Hant': {
    sub: '解開纏繞項鍊的解謎遊戲',
    lead: '抽屜深處纏成一團的項鍊，把它們一條條解開吧。越是用力拉，結就繫得越緊。',
    rulesTouch: '<div><b>抓起</b>　按住鏈子直接拖動。被抓起的地方會輕輕抬起，可以越過其他鏈子。</div><div><b>按住</b>　用兩根手指：一根按住鏈子，另一根拖動。</div><div><b>視角</b>　在空白處滑動可移動；雙指捏合縮放，扭轉旋轉，雙指同時上下滑動可傾斜。</div><div><b>目標</b>　項鍊解開後，兩端的扣環會發光。抓起一端，放到另一端上，就能扣成一圈。還纏著的項鍊扣不上。全部扣好即過關。</div>',
    rulesPC: '<div><b>抓起</b>　點擊鏈子並拖動。被抓起的地方會輕輕抬起，可以越過其他鏈子。</div><div><b>按住</b>　右鍵按住一條鏈子，同時用左鍵拖動另一條。</div><div><b>視角</b>　拖動空白處移動，滾輪縮放，右鍵拖動旋轉和傾斜。</div><div><b>目標</b>　項鍊解開後，兩端的扣環會發光。抓起一端，放到另一端上，就能扣成一圈。還纏著的項鍊扣不上。全部扣好即過關。</div>',
    lang: '語言', board: '查看排行榜', pause: '暫停', resume: '繼續', soundOn: '聲音 開', soundOff: '聲音 關',
    howTo: '玩法', startPlay: '開始', locked: '未解鎖', retry: '重新開始', levels: '選擇關卡', ranking: '排行榜', close: '關閉', view: '重設視角',
    cross: '交叉', time: '時間', cleared: '解開了', next: '下一關', post: '分享到 X',
    nameLabel: '排行榜上顯示的名字', namePh: '最多12個字', register: '登記', tray: '纏繞項鍊的托盤',
    toastStart: '越拉，結越緊', toastFreed: n => `扣好了！還剩 ${n} 條`, toastAll: '全部解開了', toastClasp: '解開了！把兩端扣在一起', stillTangled: '還纏著呢',
    newBest: '個人最佳', fastest: t => `最快 ${t}`, notCleared: '未過關', untangled: name => `解開了「${name}」。`,
    rankPrompt: '輸入名字即可登上全球排行榜。', rankSending: '正在登記成績…',
    rankResult: (r, n) => `第 <b>${r}</b> 名 ／ 共 ${n} 人`, rankBestNote: t => `（你的最佳成績 ${t} 的排名）`,
    rankError: '無法連接排行榜。在網路良好的地方再次過關即可登記。',
    nameRejected: '這個名字不能使用，請換一個。',
    loading: '載入中…', boardEmpty: '還沒有紀錄，來當第一名吧。', boardError: '無法連接排行榜。',
    shareText: (name, t) => `在解開纏繞項鍊的遊戲「ほどけない」中\n用 ${t} 解開了「${name}」`, shareRank: (r, n) => `（第 ${r} 名／共 ${n} 人）`, tags: '#ほどけない #hodokenai',
    levelNames: { L1: ['一條', '一條長長的金鍊，自己纏了一個又一個結'], L2: ['兩條', '金鍊與銀鍊，彼此鑽進對方的結裡'], L3: ['珍珠', '一串珠子，意外地容易卡住'], L4: ['三條', '從抽屜深處翻出來的一團'], L5: ['五條', '地獄。千萬別急'] },
  },
  ko: {
    sub: '엉킨 목걸이를 푸는 퍼즐',
    lead: '서랍 깊숙이 엉켜 버린 목걸이를 풀어 보세요. 세게 당길수록 매듭은 더 단단히 조여집니다.',
    rulesTouch: '<div><b>집기</b>　사슬을 터치한 채로 당기세요. 집은 부분이 살짝 들려서 다른 사슬 위를 넘어갈 수 있습니다.</div><div><b>누르기</b>　두 손가락으로, 한쪽은 사슬을 누르고 다른 쪽으로 당기세요.</div><div><b>시점</b>　빈 곳을 밀면 이동, 두 손가락으로 벌리거나 오므리면 확대·축소, 비틀면 회전, 나란히 위아래로 밀면 기울기.</div><div><b>목표</b>　다 풀린 목걸이는 양 끝의 잠금장치가 빛납니다. 한쪽 끝을 집어 다른 쪽 끝에 겹치면 고리가 되어 완성. 엉킨 채로는 잠글 수 없습니다. 모두 완성하면 클리어.</div>',
    rulesPC: '<div><b>집기</b>　사슬을 클릭해서 끄세요. 집은 부분이 살짝 들려서 다른 사슬 위를 넘어갈 수 있습니다.</div><div><b>누르기</b>　오른쪽 클릭으로 사슬을 누른 채 왼쪽 클릭으로 다른 사슬을 끄세요.</div><div><b>시점</b>　빈 곳을 드래그하면 이동, 휠로 확대·축소, 오른쪽 드래그로 회전과 기울기.</div><div><b>목표</b>　다 풀린 목걸이는 양 끝의 잠금장치가 빛납니다. 한쪽 끝을 집어 다른 쪽 끝에 겹치면 고리가 되어 완성. 엉킨 채로는 잠글 수 없습니다. 모두 완성하면 클리어.</div>',
    lang: '언어', board: '랭킹 보기', pause: '일시정지', resume: '계속하기', soundOn: '소리 켜짐', soundOff: '소리 꺼짐',
    howTo: '플레이 방법', startPlay: '시작', locked: '잠김', retry: '처음부터', levels: '레벨 선택', ranking: '랭킹', close: '닫기', view: '시점 초기화',
    cross: '교차', time: '시간', cleared: '풀었다', next: '다음 레벨', post: 'X에 게시',
    nameLabel: '랭킹에 표시할 이름', namePh: '12자까지', register: '등록', tray: '엉킨 목걸이가 놓인 트레이',
    toastStart: '당길수록 매듭이 조여집니다', toastFreed: n => `완성! 앞으로 ${n}개`, toastAll: '전부 풀었다', toastClasp: '풀렸다! 양 끝을 맞대어 잠그자', stillTangled: '아직 엉켜 있습니다',
    newBest: '개인 최고 기록', fastest: t => `최고 ${t}`, notCleared: '미클리어', untangled: name => `「${name}」을(를) 풀었습니다.`,
    rankPrompt: '이름을 입력하면 세계 랭킹에 올라갑니다.', rankSending: '기록을 등록하는 중…',
    rankResult: (r, n) => `<b>${r}</b>위 ／ ${n}명 중`, rankBestNote: t => `(최고 기록 ${t}의 순위)`,
    rankError: '랭킹에 연결할 수 없습니다. 연결이 좋은 곳에서 다시 클리어하면 등록됩니다.',
    nameRejected: '사용할 수 없는 이름입니다. 다른 이름을 입력하세요.',
    loading: '불러오는 중…', boardEmpty: '아직 기록이 없습니다. 첫 번째가 되어 보세요.', boardError: '랭킹에 연결할 수 없습니다.',
    shareText: (name, t) => `엉킨 목걸이를 푸는 게임 「ほどけない」에서\n「${name}」을(를) ${t}에 풀었다`, shareRank: (r, n) => ` (${n}명 중 ${r}위)`, tags: '#ほどけない #hodokenai',
    levelNames: { L1: ['한 줄', '긴 금목걸이 한 줄. 스스로 몇 번이나 매듭지어져 있다'], L2: ['두 줄', '금과 은이 서로의 매듭 속으로 파고들어 있다'], L3: ['진주', '구슬 줄은 의외로 잘 걸린다'], L4: ['세 줄', '서랍 깊숙한 곳에서 나온 덩어리'], L5: ['다섯 줄', '지옥. 서두르지 말 것'] },
  },
};
const LANG_NAMES = { ja: '日本語', en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ko: '한국어' };
function detectLang() {
  let saved = null; try { saved = localStorage.getItem('hodoke-lang'); } catch (e) {}
  if (saved && STRINGS[saved]) return saved;
  for (const l of (navigator.languages || [navigator.language || 'ja'])) {
    const s = String(l).toLowerCase();
    if (s.startsWith('ja')) return 'ja';
    if (s.startsWith('ko')) return 'ko';
    if (s.startsWith('zh')) return /hant|tw|hk|mo/.test(s) ? 'zh-Hant' : 'zh-Hans';
    if (s.startsWith('en')) return 'en';
  }
  return 'en';
}
let LANG = detectLang();
const t = (key, ...a) => { const v = (STRINGS[LANG] && STRINGS[LANG][key]) ?? STRINGS.ja[key]; return typeof v === 'function' ? v(...a) : v; };
const levelText = id => (STRINGS[LANG].levelNames && STRINGS[LANG].levelNames[id]) || STRINGS.ja.levelNames[id] || [id, ''];

// ===== banned-word filter for leaderboard names (the server checks the same list) =====
/*NGWORDS*/
const KATA2HIRA = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function normName(s) {
  s = KATA2HIRA(String(s).normalize('NFKC').toLowerCase());
  s = s.replace(/[0134578@$!|]/g, c => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' })[c]);
  s = s.replace(/[^\p{L}\p{N}]/gu, '');
  return s.replace(/(.)\1+/gu, '$1');
}
const NG_C = NG_WORDS.contains.map(normName).filter(Boolean), NG_E = new Set(NG_WORDS.exact.map(normName).filter(Boolean));
function nameAllowed(name) {
  const n = normName(name);
  if (!n) return false;
  if (NG_E.has(n)) return false;
  return !NG_C.some(w => n.includes(w));
}
