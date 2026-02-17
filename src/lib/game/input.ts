export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

const state: InputState = { left: false, right: false, jump: false, sprint: false };

const keyDown = (ev: KeyboardEvent) => {
  if (ev.repeat && (ev.key === ' ' || ev.key === 'ArrowUp' || ev.key.toLowerCase() === 'w')) return;
  const key = ev.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft') state.left = true;
  if (key === 'd' || key === 'arrowright') state.right = true;
  if (key === 'w' || key === 'arrowup' || key === ' ') state.jump = true;
  if (key === 'shift') state.sprint = true;
};

const keyUp = (ev: KeyboardEvent) => {
  const key = ev.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft') state.left = false;
  if (key === 'd' || key === 'arrowright') state.right = false;
  if (key === 'w' || key === 'arrowup' || key === ' ') state.jump = false;
  if (key === 'shift') state.sprint = false;
};

export const installKeyboard = () => {
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  return () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  };
};

export const setTouchControl = (control: keyof InputState, pressed: boolean) => {
  state[control] = pressed;
};

export const getInputState = (): InputState => ({ ...state });

export const clearJump = () => {
  state.jump = false;
};

export const resetInput = () => {
  state.left = false;
  state.right = false;
  state.jump = false;
  state.sprint = false;
};
