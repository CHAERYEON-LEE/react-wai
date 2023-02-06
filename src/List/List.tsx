import React, { cloneElement, ReactElement, ReactNode, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import {
  getFocusableChildren,
  getTabbableChildren,
  KEYS,
  getCompatibleKey,
  arrowNavigation,
  removeTabbable,
  restoreTabbable,
  generateUUID,
  moveFocus,
  NAVIGATION_KEYS,
  restrictChildren,
} from '../utils';
import { ListItem } from './ListItem';

export interface ListProps extends PropsWithHTMLAttr<HTMLUListElement | HTMLOListElement> {
  /**
   * Determine type of list tag
   */
  as?: 'ul' | 'ol';
  /**
   * Determine logical/visual direction of list.
   * if direction is row, use arrowleft/arrowright key to move forward/backward
   * if direction is col, use arrowup/arrowdown key to move forward/backward
   */
  direction?: 'row' | 'col';
  /**
   * Determine whether this component is nested in other List component.
   * Default value is false, Set true when List component is children of ListItem component.
   */
  nested?: boolean;
  step?: number;
  children: ReactNode;
  [key: string]: unknown;
}

export function List({
  as = 'ul',
  direction = 'row',
  nested = false,
  step = 5,
  children,
  ...restProps
}: ListProps): JSX.Element {
  restrictChildren(ListItem, children);

  const containerRef = useRef<HTMLUListElement | HTMLOListElement>(null);
  const listId = `List-${generateUUID()}`;

  let listItems: HTMLElement[] = [];
  let firstTabbable: HTMLElement;
  let lastTabbable: HTMLElement;

  useEffect(() => {
    const $container = containerRef.current;
    if ($container) {
      listItems = Array.from($container.querySelectorAll(`[data-list-id="${listId}"]`));

      const tabbableChildren = getTabbableChildren($container);
      firstTabbable = tabbableChildren[0];
      lastTabbable = tabbableChildren[tabbableChildren.length - 1];

      tabbableChildren.forEach(removeTabbable);
      restoreTabbable(firstTabbable);
    }
  }, []);

  // Tab sequence를 유지하기 위해 한 번에 최대 1개의 ListItem만 tabbable이 되도록 제어한다

  const handleFocus = (e: React.FocusEvent): void => {
    const isListItem = e.target.getAttribute('data-list-id') === listId;
    if (isListItem) {
      listItems.forEach((li) => {
        if (li === e.target) {
          restoreTabbable(li);
        } else {
          removeTabbable(li);
          getFocusableChildren(li).forEach(removeTabbable);
        }
      });
    }
  };

  // focus가 컴포넌트 바깥으로 빠져나가는 경우, 마지막 포커스 위치(요소)를 기억하기 위해 tabbable로 남겨둔다.
  // List를 중첩하여 사용하는 경우, 중첩 리스트 구조의 tab sequence를 올바르게 유지하기 위하여 맨 바깥의 List에서만 제어한다.
  const handleBlur = (e: React.FocusEvent<HTMLElement>): void => {
    if (!e.currentTarget.contains(e.relatedTarget) && !nested) {
      restoreTabbable(e.target);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement | HTMLOListElement>): void => {
    const key = getCompatibleKey(e);
    if (!NAVIGATION_KEYS.includes(key)) return;

    e.preventDefault();
    // List 컴포넌트에서는 ListItem(li 태그) 사이 키보드 네비게이션만을 제어한다.
    // ListItem 내부의 키보드 네비게이션은 기본 동작을 따르도록 한다.
    switch (key) {
      case KEYS.HOME:
        if (e.ctrlKey && nested) {
          return;
        }
        e.ctrlKey ? firstTabbable.focus() : listItems[0].focus();
        break;
      case KEYS.END:
        if (e.ctrlKey && nested) {
          return;
        }
        e.ctrlKey ? lastTabbable.focus() : listItems[listItems.length - 1].focus();
        break;
      case KEYS.PAGE_UP:
        !e.ctrlKey && moveFocus(listItems, step * -1);
        break;
      case KEYS.PAGE_DOWN:
        !e.ctrlKey && moveFocus(listItems, step);
        break;
      case KEYS.ARROW_UP:
      case KEYS.ARROW_DOWN:
      case KEYS.ARROW_LEFT:
      case KEYS.ARROW_RIGHT:
        arrowNavigation(key, listItems, direction);
        break;
    }
    e.stopPropagation();
  };

  return (
    <StyledList
      as={as}
      ref={containerRef}
      aria-orientation={direction === 'row' ? 'horizontal' : 'vertical'}
      direction={direction}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-list-id={listId}
      {...restProps}
    >
      {React.Children.map(children, (child) => cloneElement(child as ReactElement, { listId }))}
    </StyledList>
  );
}

const StyledList = styled.ul<ListProps>`
  display: flex;
  flex-direction: ${({ direction }): string => (direction === 'row' ? 'row' : 'column')};
`;
