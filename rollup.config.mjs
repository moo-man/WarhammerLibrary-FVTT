/* eslint-disable no-undef */
import foundryConfig from "./foundry-path.js";
import copy from 'rollup-plugin-copy';
import postcss from "rollup-plugin-postcss";

let modulePath = foundryConfig();
export default {
	input: ['src/warhammer-lib.js'],
	output: {dir: modulePath},
	plugins: [
		copy({
			targets : [
				{src: "./module.json", dest : modulePath},
				{src: "./static/*", dest : modulePath}
			],
            watch: process.env.NODE_ENV == "production" ? false : ["./static/**", "system.json", "template.json"]
		}),
		postcss({
			extract: "warhammer.css",
			plugins : []
		})
	],
	// output: rollupPaths.map(repoPath => {
	// 	let outputPath = path.join(repoPath, 'warhammer-lib.js')
	// 	return {
	// 		file: outputPath,
	// 		format: 'cjs'
	// 	}
	// })
};