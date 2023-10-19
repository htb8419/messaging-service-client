import external from 'rollup-plugin-peer-deps-external';
import resolve from "@rollup/plugin-node-resolve";
import babel from '@rollup/plugin-babel';
import json from "@rollup/plugin-json";

const extensions = ['.js', '.jsx', '.ts', '.tsx', ".json"];
const isDevelopment =true// !!process.env.ROLLUP_WATCH;
console.log('rollup is development mod > ', isDevelopment)
export default [
    {
        input: "src/index.js",
        output: [
            {
                file: 'dist/index.es.js',
                format: "es",
                sourcemap: isDevelopment,
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