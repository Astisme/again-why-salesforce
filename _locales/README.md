# Locale translations
These folders follow the [standard structure](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization#anatomy_of_an_internationalized_extension) for extension localization.
At the moment, all translations are powered by AI. Feel free to update a translation you do not like or wish to improve.
When doing so, please create a README.md file in the locale folder you made your change to describe what you changed. This will help you getting known online :)

# Prompt used to get the translations
I need you to translate the big json from before into these languages. feel free to do 1 at a time you should translate everything related to the message and description keys while keeping "Tab" as is across all translations. there is only 1 special rule: for extension_label.message, no translation is necessary (but it is mandatory for extension_label.description) you are free to translate what's inside the square brackets as well.
you're supposed to translate both the message and the description for each object into the requested language
keep the original capitalization also in the translated language. for example, Change Theme to Light should become Cambiar Tema a Claro in spanish. you must NOT simply capitalizing everything
you may start with the next languages at the pace you prefer. be sure to tell me which language code you're working with before giving back the full JSON
before sending your output, make sure all the keys are present. if you forget a key, we'll have to go through all the languages multiple times.
please try to be as troughful as possible to the translated language and do not worry about limits as there's lots of time available.
