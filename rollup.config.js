import external from 'rollup-plugin-peer-deps-external';
import resolve from "@rollup/plugin-node-resolve";
import babel from '@rollup/plugin-babel';
import json from "@rollup/plugin-json";

const extensions = ['.js', '.jsx', '.ts', '.tsx', ".json"];
const development = !!process.env.ROLLUP_WATCH;
console.log('rollup is development mode > ', development)
export default [
    {
        input: "src/index.js",
        output: [
            {
                file: 'dist/index.es.js',
                format: "es",
                sourcemap: development,
            },
        ],
        plugins: [
            resolve(),
            external(),
            json(),
            babel({
                babelHelpers: 'bundled',
                exclude: './node_modules/**',
                extensions
            }),
        ],
    }
];