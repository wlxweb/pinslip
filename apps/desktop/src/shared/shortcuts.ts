/**
 * 全局快捷键：旧版预设 id 与任意 Electron accelerator 的单一解析处。
 * 设置里存的值可以是 'off'、历史预设（'ctrl+shift+n' 等），或用户录下的
 * accelerator（如 'CommandOrControl+Shift+K'）。注册与展示都先解析成 accelerator。
 */

/** 旧版下拉预设 → accelerator。已写入 settings.json 的值继续有效。 */
export const LEGACY_SHORTCUT_ACCELERATORS: Record<string, string> = {
  'ctrl+shift+n': 'CommandOrControl+Shift+N',
  'ctrl+alt+q': 'CommandOrControl+Alt+Q',
  'ctrl+shift+q': 'CommandOrControl+Shift+Q',
  'ctrl+alt+n': 'CommandOrControl+Alt+N',
  'ctrl+shift+alt+n': 'CommandOrControl+Shift+Alt+N',
  'ctrl+alt+insert': 'CommandOrControl+Alt+Insert',
};

const MOD_ALIAS: Record<string, string> = {
  Command: 'Command',
  Cmd: 'Command',
  Control: 'Control',
  Ctrl: 'Control',
  CommandOrControl: 'CommandOrControl',
  CmdOrCtrl: 'CommandOrControl',
  Alt: 'Alt',
  Option: 'Alt',
  AltGr: 'AltGr',
  Shift: 'Shift',
  Super: 'Super',
  Meta: 'Meta',
};

const MOD_ORDER = ['CommandOrControl', 'Command', 'Control', 'Alt', 'AltGr', 'Shift', 'Super', 'Meta'];

const STRONG_MODS = new Set(['CommandOrControl', 'Command', 'Control', 'Alt', 'AltGr', 'Super', 'Meta']);

const KEY_ALIAS: Record<string, string> = {
  Return: 'Enter',
  Esc: 'Escape',
};

/** 允许写入全局快捷键的键名（Electron accelerator 键码的子集）。 */
const KEY_RE =
  /^(?:[A-Z0-9]|F(?:[1-9]|1\d|2[0-4])|Plus|Space|Tab|Backspace|Delete|Insert|Enter|Escape|Up|Down|Left|Right|Home|End|PageUp|PageDown|[-[\]\\;',./=`']|num(?:[0-9]|dec|add|sub|mult|div))$/;

/** 把用户输入或历史预设收成稳定的 accelerator；无法注册则返回 null（含 'off'）。 */
export function resolveShortcutAccelerator(value: string | undefined | null): string | null {
  if (!value || value === 'off') return null;
  const legacy = LEGACY_SHORTCUT_ACCELERATORS[value];
  return canonicalizeAccelerator(legacy ?? value);
}

/** 校验并规范化 accelerator：修饰键按固定顺序，键名走别名。非法返回 null。 */
export function canonicalizeAccelerator(raw: string): string | null {
  const parts = raw.split('+').filter((part) => part.length > 0);
  if (parts.length < 2) return null;
  const key = KEY_ALIAS[parts[parts.length - 1]] ?? parts[parts.length - 1];
  if (!KEY_RE.test(key)) return null;
  const mods: string[] = [];
  for (const part of parts.slice(0, -1)) {
    const mod = MOD_ALIAS[part];
    if (!mod || mods.includes(mod)) return null;
    mods.push(mod);
  }
  if (!mods.some((mod) => STRONG_MODS.has(mod))) return null;
  mods.sort((a, b) => MOD_ORDER.indexOf(a) - MOD_ORDER.indexOf(b));
  return [...mods, key].join('+');
}

/** 同一平台上是否会抢到同一个系统快捷键（CommandOrControl 按平台展开后再比）。 */
export function shortcutsConflict(
  a: string | undefined | null,
  b: string | undefined | null,
  platform: string,
): boolean {
  const left = resolveShortcutAccelerator(a);
  const right = resolveShortcutAccelerator(b);
  if (!left || !right) return false;
  return normalizeForPlatform(left, platform) === normalizeForPlatform(right, platform);
}

function normalizeForPlatform(accelerator: string, platform: string): string {
  const primary = platform === 'darwin' ? 'Command' : 'Control';
  return accelerator
    .split('+')
    .map((part) => (part === 'CommandOrControl' ? primary : part))
    .join('+');
}

const KEY_SYMBOLS: Record<string, string> = {
  Enter: '↩',
  Escape: 'Esc',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
  Space: 'Space',
  Tab: 'Tab',
  Backspace: '⌫',
  Delete: '⌦',
};

/** 设置页与托盘共用的展示文案。macOS 用符号，其他平台用 Ctrl/Alt/Shift。 */
export function formatShortcut(value: string | undefined | null, platform: string): string {
  const accelerator = resolveShortcutAccelerator(value);
  if (!accelerator) return '';
  const mac = platform === 'darwin';
  const modLabel: Record<string, string> = {
    CommandOrControl: mac ? '⌘' : 'Ctrl',
    Command: '⌘',
    Control: mac ? '⌃' : 'Ctrl',
    Alt: mac ? '⌥' : 'Alt',
    AltGr: 'AltGr',
    Shift: mac ? '⇧' : 'Shift',
    Super: mac ? '⌘' : 'Super',
    Meta: mac ? '⌘' : 'Super',
  };
  const parts = accelerator.split('+');
  const key = parts.pop() ?? '';
  const mods = parts.map((part) => modLabel[part] ?? part);
  const keyLabel = KEY_SYMBOLS[key] ?? key;
  return mac ? [...mods, keyLabel].join('') : [...mods, keyLabel].join('+');
}
