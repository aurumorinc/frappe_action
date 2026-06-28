export function visibleInViewport(element: Element): boolean {
  const { top, left, bottom, right, height, width } =
    element.getBoundingClientRect();

  if (height === 0 || width === 0) return false;

  return (
    top >= 0 &&
    left >= 0 &&
    bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function isXPath(str: string): boolean {
  const regex = /^([(/@]|id\()/;
  return regex.test(str);
}
