import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';

export default {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'OnlySpecs',
        description: 'Multi-editor Electron app with Monaco Editor',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'OnlySpecs',
          homepage: 'https://github.com/yourusername/only-specs',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          homepage: 'https://github.com/yourusername/only-specs',
        },
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.mjs',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.mjs',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.mjs',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
