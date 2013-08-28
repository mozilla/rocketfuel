define('forms', ['jquery', 'l10n', 'z'], function($, l10n, z) {

    function checkValid(form) {
        if (form) {
            $(form).filter(':not([novalidate])').find('button[type=submit]').attr('disabled', !form.checkValidity());
        }
    }
    z.body.on('change keyup paste', 'input, select, textarea', function(e) {
        checkValid(e.target.form);
        if (e.target.value) {
            e.target.setAttribute('value', e.target.value);
        } else {
            e.target.removeAttribute('value');
        }
    }).on('loaded decloak', function() {
        $('form:not([novalidate])').each(function() {
            checkValid(this);
        });
        $('form[novalidate] button[type=submit]').removeAttr('disabled');
    })

    // Field stuff
    function reset_field(e) {
        e.preventDefault();
        var $this = $(this);
        var $form = $this.is('form') ? $this : $this.closest('form');
        if (!$form[0].checkValidity()) {
            return;
        }
        var $field = $this.closest('.field');
        $field.removeClass('active');
        var value = $this.val();  // Select boxes
        if (!value) {
            var input = $this.find('input, textarea');
            // Translated fields, text boxes
            value = input.data('value') || input.val();
        }
        $field.trigger('updated', [value]);
    }

    z.body.on('click', '.field p', function(e) {
        e.preventDefault();
        var form = $(this).parent();
        form.addClass('active');
        form.find('input, textarea, select').trigger('focus');
    }).on('change', '.field select:not(.locale)', reset_field)
      .on('submit', '.field form', reset_field);

    // Add support for localized fields.
    z.win.on('loaded', function() {
        var translated_fields = $('input[type=translated], textarea[translated]');
        translated_fields.each(function(i, elem) {
            var $elem = $(elem);
            var values = $elem.data('value');
            var locale_picker = $('<select class="locale">');
            for (var locale in values) {
                locale_picker.append('<option>' + locale + '</option>');
            }
            var other_locales = $('<optgroup>');
            other_locales.attr('label', gettext('Other Locales'));
            for (var i in l10n.languages) {
                var locale = l10n.languages[i];
                if (locale in values) {
                    continue;
                }
                other_locales.append('<option>' + locale + '</option>')
            }
            locale_picker.append(other_locales).insertBefore(elem);

            // Select the user's current language.
            var previous_value = navigator.l10n.language;
            // If the user's locale isn't one of the values, use a valid value.
            if (!(previous_value in values) && values.keys()) {
                previous_value = values.keys()[0];
            }
            locale_picker.val(previous_value);
            $elem.val(values[previous_value] || '');

            function save() {
                var $elem = $(elem);  // Get a new reference!
                var data = $elem.data('value');
                // Save the old value.
                data[previous_value] = $elem.val();
                $elem.data(data);
                // Set the new value and update previous_value.
                $elem.val(data[previous_value = $(this).val()]);
                // Give the element focus.
                $elem.trigger('focus');
            }
            locale_picker.on('change', save);
            locale_picker.closest('form').on('submit', save);
        });
    })

    // Use this if you want to disable form inputs while the post/put happens.
    function toggleSubmitFormState($formElm, enabled) {
        $formElm.find('textarea, button, input').prop('disabled', !enabled);
        $formElm.find('.ratingwidget').toggleClass('disabled', !enabled);
        if (enabled) {
            checkValid($formElm[0]);
        }
    }

    return {toggleSubmitFormState: toggleSubmitFormState};

});
