import { createContext, useContext } from 'react';

/** 나의메뉴에 넣은 화면 하나 */
export type FavScreen = { code: string; title: string; path: string };

/**
 * 단말 나의메뉴(즐겨찾기). 화면 제목 앞 별을 누르면 넣고 빼며, 왼쪽 [나의메뉴]에 모입니다.
 * 직원마다 이 브라우저에만 저장합니다 (목업 데이터와 달리 새로고침해도 남음).
 */
export interface Favorites {
  isFav: (code: string) => boolean;
  toggle: (code: string) => void;
}

export const FavoritesContext = createContext<Favorites | null>(null);

export function useFavorites() {
  return useContext(FavoritesContext);
}

const key = (employeeNo: string) => `chainone:fav:${employeeNo}`;

export function loadFavs(employeeNo: string): FavScreen[] {
  try {
    const raw = localStorage.getItem(key(employeeNo));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(
          (f): f is FavScreen =>
            !!f &&
            typeof f.code === 'string' &&
            typeof f.title === 'string' &&
            typeof f.path === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export function saveFavs(employeeNo: string, list: FavScreen[]) {
  try {
    localStorage.setItem(key(employeeNo), JSON.stringify(list));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 창 등)에서는 이번 접속 동안만 기억합니다.
  }
}
