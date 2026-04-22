# Contributing to StreamFenceJs

## Getting started

```bash
git clone https://github.com/MoshPe/StreamFenceJs.git
cd StreamFenceJs
npm install
```

## Development workflow

```bash
npm test          # run all tests
npm run typecheck # TypeScript type check
npm run lint      # lint
npm run build     # build dist
```

## Submitting changes

1. Fork the repo and create a branch from `main`
2. Add tests for any new behaviour
3. Ensure `npm test` passes with no failures
4. Open a pull request against `main`

## Reporting bugs

Open an issue on [GitHub](https://github.com/MoshPe/StreamFenceJs/issues) with:
- Node.js version
- StreamFenceJs version
- Minimal reproduction

## Code style

- TypeScript strict mode
- ESLint + Prettier (run `npm run format` before committing)
- No `any` without justification

## License

By contributing you agree that your work will be licensed under [Apache 2.0](LICENSE).
