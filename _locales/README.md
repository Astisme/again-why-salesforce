# Locale translations

These folders follow the [standard structure](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#anatomy_of_an_internationalized_extension) for extension localization; the languages taken into consideration are [listed here](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales).
At the moment, all translations are powered by AI. Feel free to update a translation you do not like or wish to improve.
When doing so, please create a README.md file in the locale folder you made your change to describe what you changed. This will help you getting known online :)

To sort the keys of the messages.json files, please run `deno task sort`.

# Prompt used to get the translations

I need you to translate the big json from before into these languages. feel free to do 1 at a time you should translate everything related to the message and description keys while keeping "Tab" as is across all translations. you are free to translate what's inside the square brackets as well.
you're supposed to translate both the message and the description for each object into the requested language
keep the original capitalization also in the translated language. for example, "Change Theme to Light" should become "Cambiar Tema a Claro" in spanish. you must NOT simply capitalizing everything
you may start with the next languages at the pace you prefer. be sure to tell me which language code you're working with before giving back the full JSON
before sending your output, make sure all the keys are present. if you forget a key, we'll have to go through all the languages multiple times.
please try to be as thoughtful as possible to the translated language and do not worry about limits as there's lots of time available.
This is the list of languages that you should translate to; already ordered so you should go from first to last.

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
