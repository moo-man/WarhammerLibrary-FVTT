/* eslint-disable no-undef */
import path from "path"
import foundryConfig from "./foundry-path.js";
import copy from 'rollup-plugin-copy';

let modulePath = foundryConfig();
export default {
	input: 'src/lib.js',
	output: {file : path.join(modulePath, "warhammer.js")},
	plugins: [
		copy({
			targets : [
				{src: "./module.json", dest : modulePath},
				{src: "./static/*", dest : modulePath}
			],
            watch: process.env.NODE_ENV == "production" ? false : ["./static/**", "system.json", "template.json"]
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