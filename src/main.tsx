import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import MainWindow from './windows/main/MainWindow';
import PopupWindow from './windows/popup/PopupWindow';
import './index.css';

// 两个窗口共用同一份前端代码，按窗口 label（在 src-tauri/tauri.conf.json 里定义）决定渲染谁
const roots: Record<string, React.ComponentType> = {
  main: MainWindow,
  popup: PopupWindow,
};

const label = getCurrentWindow().label;
const Root = roots[label];

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {Root ? <Root /> : <p className="p-4 text-sm">未知的窗口 label：{label}</p>}
  </React.StrictMode>,
);
