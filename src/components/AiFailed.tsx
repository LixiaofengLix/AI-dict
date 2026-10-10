import { Mascot } from './Mascot';
import { buttonClass, CAPTION, CENTER_TITLE } from './styles';

/** AI 请求失败（样张 06）：闭眼的小角色 + 原因 + 重试。词卡、翻译各处共用 */
export function AiFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-6 text-center">
      <Mascot kind="sleepy" size={64} />
      <h3 className={CENTER_TITLE}>AI 请求失败</h3>
      <p className={`max-w-[17rem] ${CAPTION}`}>{message}</p>
      <button type="button" onClick={onRetry} className={buttonClass('dark')}>
        重试
      </button>
    </div>
  );
}
