import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { canonicalizeAccelerator, formatShortcut } from '@shared/shortcuts';

interface ShortcutRecorderProps {
  /** 已保存的快捷键：'off'、历史预设 id，或 accelerator */
  value: string;
  platform: string;
  onChange: (next: string) => void;
}

const CODE_TO_KEY: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Escape: 'Escape',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
};

function keyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `num${code.slice(6)}`;
  if (/^F(?:[1-9]|1\d|2[0-4])$/.test(code)) return code;
  return CODE_TO_KEY[code] ?? null;
}

function isModifierCode(code: string): boolean {
  return /^(Control|Shift|Alt|Meta)(Left|Right)$/.test(code);
}

/**
 * 点击后录制下一次按键组合。单独 Esc 取消，单独 Delete / Backspace 关闭快捷键。
 * 必须带 ⌘、Ctrl 或 Alt，避免把普通打字键注册成全局快捷键。
 */
export default function ShortcutRecorder({ value, platform, onChange }: ShortcutRecorderProps) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const label = formatShortcut(value, platform);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat || isModifierCode(event.code)) return;

      const bare = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      if (bare && event.code === 'Escape') {
        setRecording(false);
        return;
      }
      if (bare && (event.code === 'Backspace' || event.code === 'Delete')) {
        setRecording(false);
        if (value !== 'off') onChange('off');
        return;
      }

      const key = keyFromCode(event.code);
      if (!key) return;
      const mac = platform === 'darwin';
      const mods: string[] = [];
      // macOS 的 ⌘ 记成 CommandOrControl，换到 Windows/Linux 时对应 Ctrl。
      // 非 mac 的 Win/Super 不收录，避免和系统键抢。
      if (event.metaKey && mac) mods.push('CommandOrControl');
      if (event.ctrlKey) mods.push(mac ? 'Control' : 'CommandOrControl');
      if (event.altKey) mods.push('Alt');
      if (event.shiftKey) mods.push('Shift');
      if (mods.length === 0) return;
      const accelerator = canonicalizeAccelerator([...mods, key].join('+'));
      if (!accelerator) return;
      setRecording(false);
      if (accelerator !== value) onChange(accelerator);
    };
    const stop = () => setRecording(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', stop);
    };
  }, [recording, onChange, platform, value]);

  return (
    <span className="shortcut-recorder">
      <button
        type="button"
        className={`shortcut-recorder__key${recording ? ' is-recording' : ''}`}
        aria-pressed={recording}
        onClick={() => setRecording((current) => !current)}
      >
        {recording ? t('settings.shortcutRecording') : label || t('settings.shortcutUnset')}
      </button>
      {value !== 'off' && !recording && (
        <button
          type="button"
          className="shortcut-recorder__clear"
          title={t('settings.shortcutClear')}
          onClick={() => onChange('off')}
        >
          {t('settings.shortcutOff')}
        </button>
      )}
    </span>
  );
}
