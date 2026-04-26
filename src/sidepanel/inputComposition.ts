export function shouldDeferSearchRender(event: Event, isComposingSearch: boolean): boolean {
  return isComposingSearch || Boolean((event as InputEvent).isComposing);
}
