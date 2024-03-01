import {
  Queries,
  RenderHookOptions,
  queries,
  renderHook as renderHookOriginal,
} from '@testing-library/react'

// https://github.com/testing-library/react-testing-library/pull/991#issuecomment-1207138334
export const renderHook = <
  Result,
  Props,
  Q extends Queries = typeof queries,
  Container extends Element | DocumentFragment = HTMLElement,
  BaseElement extends Element | DocumentFragment = Container,
>(
  render: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props, Q, Container, BaseElement>,
) => {
  const results: Result[] = []

  const renderHookResult = renderHookOriginal((initialProps) => {
    const value = render(initialProps)
    results.push(value)
    return value
  }, options)

  return Object.assign(renderHookResult, { results })
}
