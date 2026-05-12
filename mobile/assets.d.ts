// Type declarations for React Native asset imports. Without these, ESM
// imports of `*.png` / `*.svg` / etc. trip TS2307 ("cannot find module").
// React Native's Metro bundler resolves these paths and `<Image source={…}>`
// accepts the numeric module reference that the bundler returns.

declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

declare module '*.gif' {
  const value: number;
  export default value;
}

declare module '*.webp' {
  const value: number;
  export default value;
}

declare module '*.svg' {
  const value: number;
  export default value;
}
