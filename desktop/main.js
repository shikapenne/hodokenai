// ほどけない — PC (Steam) 版の入れ物。ゲーム本体は www/（tools/build_web.py --target steam が作る）
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// Steam 版はひとつだけ起動する（二重起動したら前の窓を前に出す）
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    fullscreen: !process.argv.includes('--windowed'), // 最初は全画面。F11 / Alt+Enter で切り替え
    backgroundColor: '#120e22',
    title: 'ほどけない',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'www', 'index.html'));

  // X へのポストなど、外へのリンクはふつうのブラウザで開く（https だけ）
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', e => e.preventDefault());

  // 全画面の切り替えと、ズームの無効化（Ctrl+ホイールで画面が拡大しないように）
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if ((input.control || input.meta) && ['+', '-', '=', '0'].includes(input.key)) e.preventDefault();
  });
  win.webContents.setVisualZoomLevelLimits(1, 1);
}

Menu.setApplicationMenu(null);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
