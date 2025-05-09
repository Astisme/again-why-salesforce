# Locale translations

These folders follow the [standard structure](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#anatomy_of_an_internationalized_extension) for extension localization; the languages taken into consideration are [listed here](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales).
At the moment, all translations are powered by AI. Feel free to update a translation you do not like or wish to improve.
When doing so, please create a README.md file in the locale folder you made your change to describe what you changed. This will help you getting known online :)

To sort the keys of the messages.json files, please run `deno task sort`.

# Prompt used to get the translations

You will be provided with a JSON object. Your task is to translate specific parts of this JSON into multiple languages. Please follow these instructions precisely.
**1. Input JSON Structure:**
The JSON object you receive will contain:
a. A key (e.g., "0") which holds two arrays: "locales" (a list of language codes for translation) and "missingKeys" (a list of the specific keys whose string values need translation).
b. Several other top-level keys. The keys listed in the "missingKeys" array are the ones whose content you need to translate. Each of these objects (e.g., "confirm_update_extension", "error_unknown_message") contains "message" and "description" string values that require translation.
**2. Languages for Translation:**

- You must use the list of language codes provided in the input JSON under the "locales" array (i.e., from `inputJSON["0"]["locales"]`).
- Process the languages in the exact order they appear in that "locales" list.
  **3. What to Translate:**
- For each key name found in the "missingKeys" list from the input JSON (e.g., `inputJSON["0"]["missingKeys"]`):
- Translate the string value of its "message" field.
- Translate the string value of its "description" field.
  **4. Translation Rules:**
- **Placeholders:** Any word starting with a `$` symbol (e.g., `$extension_label`) must be preserved exactly as is, without translation.
- **Specific Word "Tab":** The word "Tab" must be kept as "Tab" in all translations; do not translate this specific word.
- **Bracketed Content:** Text found within square brackets `[]` (e.g., `[error]`) must also be translated according to the target language.
- **Capitalization:** Maintain the original capitalization style of the source text in your translation. For instance, if the English source is "Error Checking for Updates", a Spanish translation should be something like "Error al Comprobar Actualizaciones", not "error al comprobar actualizaciones" or "ERROR AL COMPROBAR ACTUALIZACIONES" or "Error Al Comprobar Actualizaciones".
- **Accuracy & Fluency:** Ensure translations are accurate, contextually appropriate, and sound natural in the target language.
  **5. Output Format for EACH Language:**
- **Language Indication:** Before providing the translated content for any language, you **must** first print a line indicating the language code you are currently processing. This line should be formatted exactly as:
  `Processing language: [language_code]`
  (Example: `Processing language: es`)
- **Translated Content Structure:** Following the language indication line, output the translated key-value pairs.
- Your output for each language should **only** consist of the translated objects whose keys were listed in the "missingKeys" array.
- Do **NOT** include the numbered key (like "0") or its content (the "locales" or "missingKeys" arrays themselves) in your output.
- The entire block of translated key-value pairs for a single language **must NOT** be enclosed in outer curly braces (`{}`).
- Each translated object (which is a key-value pair, e.g., `"confirm_update_extension": { ... }`) must be followed by a comma (`,`). This includes the **very last translated object** in the sequence for that language.
- **Completeness:** You must ensure that ALL keys originally listed in the "missingKeys" array are present in your translated output for EACH language. Do not omit any.
  **Example of the expected output structure for ONE language (e.g., 'fr', assuming "missingKeys" were ["key_A", "key_B"]):**
  Processing language: fr

```
"key_A": {
"message": "Message translated to French for key_A",
"description": "Description translated to French for key_A"
},
"key_B": {
"message": "Message translated to French for key_B",
"description": "Description translated to French for key_B"
},
```

**Workflow Summary:**

1. Parse the input JSON.
2. Extract the list of language codes from `inputJSON["0"]["locales"]`.
3. Extract the list of keys to be translated from `inputJSON["0"]["missingKeys"]`.
4. Iterate through the language codes in the specified order.
5. For each language:
   a. Print the `Processing language: [language_code]` line.
   b. Open a code block
   c. Provide the translated objects for all keys found in "missingKeys", ensuring the output format (no outer braces, comma after every object including the last) is strictly followed.
   d. Close the code block
   You are to act as a translation engine adhering to these rules. After this prompt, you will receive the JSON data to be translated. Begin with the first language in the "locales" list from the provided JSON.
   If you understand these simple rules, respond only with "OK" and you'll be provided with the JSON to translate; otherwise if you have questions for me, send anything other than "OK" and I'll try to help you out.

# List of languages

1. en (English) [this is the language in which I've sent you the JSON. YOU MUST NOT send this back to me. Ignore it as this is only for your reference]
2. zh_CN (Mandarin Chinese)
3. hi (Hindi)
4. es (Spanish)
5. fr (French)
6. bn (Bengali)
7. ar (Arabic)
8. pt_BR (Portuguese - Brazil)
9. ru (Russian)
10. id (Indonesian)
11. de (German)
12. ja (Japanese)
13. vi (Vietnamese)
14. fa (Persian)
15. ko (Korean)
16. tr (Turkish)
17. it (Italian)
18. pl (Polish)
19. uk (Ukrainian)
20. am (Amharic)
21. fil (Filipino)
22. nl (Dutch)
23. el (Greek)
24. hu (Hungarian)
25. cs (Czech)
26. ca (Catalan)
27. sv (Swedish)
28. he (Hebrew)
29. bg (Bulgarian)
30. sr (Serbian)
31. hr (Croatian)
32. da (Danish)
33. fi (Finnish)
34. no (Norwegian)
35. sk (Slovak)
36. lt (Lithuanian)
37. sl (Slovenian)
38. lv (Latvian)
39. et (Estonian)
40. ms (Malay)
41. pt_PT (Portuguese - Portugal)
42. ro (Romanian)
43. sw (Swahili)
44. ta (Tamil)
45. te (Telugu)
46. th (Thai)
47. zh_TW (Traditional Chinese)
48. en_AU (English - Australia) [for this language, only translate the keys which differ from the original JSON I sent you. ignore all messages which would not change at all]
49. en_GB (English - UK) [for this language, only translate the keys which differ from the original JSON I sent you. ignore all messages which would not change at all]
50. en_US (English - US) [for this language, only translate the keys which differ from the original JSON I sent you. ignore all messages which would not change at all]
51. es_419 (Spanish - Latin America) [for this language, only translate the keys which differ from the translation for the "es" JSON. ignore all messages which would not change at all]
52. gu (Gujarati)
53. kn (Kannada)
54. ml (Malayalam)
55. mr (Marathi)
