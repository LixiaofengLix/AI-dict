import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import MainWindow from './windows/main/MainWindow';
import PopupWindow from './windows/popup/PopupWindow';
import SnipWindow from './windows/snip/SnipWindow';
import { getDb } from './services/db';
import './index.css';

// 启动就把数据库打开：数据库文件不存在会自动重建，迁移在这里跑完。
// 读写都在各 service 里做，这里只是保证应用一起来数据库就是就绪的
getDb().catch((error: unknown) => {
  console.error('打开数据库失败', error);
});

// 几个窗口共用同一份前端代码，按窗口 label 决定渲染谁。main、popup 在 src-tauri/tauri.conf.json
// 里定义；snip（Windows 截图框选）用到时才由 services/window 建
const roots: Record<string, React.ComponentType> = {
  main: MainWindow,
  popup: PopupWindow,
  snip: SnipWindow,
};

const label = getCurrentWindow().label;
const Root = roots[label];

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {Root ? <Root /> : <p className="p-4 text-sm">未知的窗口 label：{label}</p>}
  </React.StrictMode>,
);
