import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import stylisticJs from '@stylistic/eslint-plugin-js';

export default [
    js.configs.recommended,
    jsdoc.configs['flat/recommended'],
    {
        files: ["**/*.js"],
        rules: {
            "no-unused-vars": "off",
            "no-undef": "warn",
            "indent": "error",
            "semi" : "error",
            "curly" : ["error", "all"],
            "@stylistic/js/brace-style" : ["error", "allman", {"allowSingleLine" : true}],
            "jsdoc/no-undefined-types" : "off"
        },
        plugins : {
            jsdoc,
            "@stylistic/js" : stylisticJs
        },
        languageOptions : {
            globals: {
                foundry: "readonly",
                game : "readonly",
                CONFIG : "readonly",
                ui : "readonly",
                renderTemplate : "readonly",
                Dialog : "readonly",
                ActiveEffectConfig : "readonly",
                MeasuredTemplateConfig : "readonly",
                Hooks : "readonly",
                Handlebars : "readonly",
                FormApplication : "readonly",
                FormDataExtended : "readonly",
                canvas : "readonly",
                Application : "readonly",
                Collection : "readonly",
                Roll : "readonly" ,
                loadTemplates : "readonly",
                fromUuidSync : "readonly",
                Item : "readonly",
                Actor : "readonly",
                fromUuid : "readonly",
                $ : "readonly",
                PIXI : "readonly",
                SceneNavigation : "readonly",
                ...globals.browser
            }
        }
    },
];