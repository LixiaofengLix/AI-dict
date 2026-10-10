import { isMac } from '../utils/platform';

/** 快捷键写法里 CmdOrCtrl 这类跨平台的名字，换成当前平台键帽上的字 */
function keyName(key: string): string {
  if (key === 'CmdOrCtrl' || key === 'CommandOrControl') return isMac ? 'Cmd' : 'Ctrl';
  return key;
}

/** 键帽（样张 .kbd）：把 Alt+D 拆成一个个按键显示 */
export function Keys({ accelerator }: { accelerator: string }) {
  const keys = accelerator
    .split('+')
    .map((key) => key.trim())
    .filter(Boolean);
  return (
    <>
      {keys.map((key, index) => (
        <span
          key={index}
          className="rounded-[9px] border border-b-[3px] border-line bg-surface px-2 py-0.5 text-footnote font-bold text-ink"
        >
          {keyName(key)}
        </span>
      ))}
    </>
  );
}
