import { createContext, useContext } from 'react';

/**
 * 단말 탭: 열어 둔 화면은 숨겨 둔 채 그대로 살려 둡니다.
 * 지금 보이는 탭이면 true, 뒤에 숨어 있는 탭이면 false입니다.
 * 숨은 화면은 기능키(F2 등)에 반응하지 않고, 팝업 창(TWindow)도 띄우지 않습니다.
 * 단말 밖(기업 화면)에서는 늘 true입니다.
 */
export const ScreenActiveContext = createContext(true);

export function useScreenActive() {
  return useContext(ScreenActiveContext);
}
