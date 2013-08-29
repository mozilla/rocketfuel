define('views/collection',
    ['cache', 'jquery', 'l10n', 'models', 'notification', 'requests', 'templates', 'urls', 'utils', 'z', 'lib/html5sortable.jquery'],
    function(cache, $, l10n, models, notification, requests, nunjucks, urls, utils, z) {

    var gettext = l10n.gettext;
    var collection_model = models('collection');
    var app_model = models('app');

    function get_collection() {
        return collection_model.lookup($('.main').data('id'));
    }

    function update_sort() {
        $('ul.apps').sortable({handle: '.handle'});
    }

    z.page.on('click', 'a.add_app', function(e) {
        e.preventDefault();
        $('.dialog').addClass('hidden');
        $('#app_search').removeClass('hidden');

    }).on('click', 'a.duplicate_collection', function(e) {
        e.preventDefault();
        $('.dialog').addClass('hidden');
        $('#duplicate_collection').removeClass('hidden');

    }).on('submit', '#duplicate_collection form', function(e) {
        var $this = $(this);
        e.preventDefault();
        var data = utils.getVars($this.serialize());

        var $button = $this.find('.button');
        var button_text = $button.text();
        $button.addClass('disabled').html('<div class="spinner">');

        requests.post(
            urls.api.url('duplicate', [get_collection().id]),
            data
        ).done(function(data) {
            collection_model.cast(data);

            notification.notification({message: gettext('Successfully duplicated')});
            z.page.trigger('navigate', [urls.reverse('collection', [data.id])]);

        }).fail(function() {
            notification.notification({message: gettext('Failed to duplicate collection')})
            $button.removeClass('disabled').text(button_text);
        });

    }).on('submit', '#app_search form', function(e) {
        e.preventDefault();
        var list = $('#app_search_results');
        requests.get(
            utils.urlparams(
                urls.api.url('search'),
                {'q': $('#app_search input[type=search]').val(),
                 'region': 'None'}
            )
        ).done(function(data) {
            list.html('');
            data.objects.forEach(function(v) {
                app_model.cast(v);
                if ($('#app-list .app[data-id="' + v.id + '"]').length) {
                    // Don't show apps that have already been added.
                    return;
                }
                list.append('<li>' + nunjucks.env.getTemplate('helpers/app.html').render(
                    {'this': v, 'allow_delete': false}));
            });

            var collection = get_collection();
            apply_incompat(collection.region, data.objects);
        }).fail(function() {
            notification.notification({message: gettext('Search failed :-(')});
        });

    }).on('click', '.dialog .close', function(e) {
        e.preventDefault();
        $('.dialog').addClass('hidden');

    }).on('click', '.app .delete', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $app = $(this).parent();
        $app.hide();
        var app_id = $app.data('id');
        var collection = get_collection();
        var app = app_model.lookup(app_id + '', 'id');

        requests.post(
            urls.api.url('remove_app', [collection.id]),
            {app: app.id}
        ).done(function() {
            // Do some cache rewriting.
            collection.apps = collection.apps.filter(function(coll_app) {
                return coll_app.id != app.id;
            });

            $app.remove();

            notification.notification({message: gettext('Removed {app} from collection.', {app: app.name})});

        }).fail(function() {
            $app.show();
            notification.notification({message: gettext('Could not delete app from collection.')});
        });

    }).on('click', '#app_search a.app', function(e) {
        e.preventDefault();

        var $this = $(this);
        var app = $this.data('id');
        $this.parent().remove();
        var collection = get_collection();
        var app_data = app_model.lookup(app + '', 'id');
        var $app = $(nunjucks.env.getTemplate('helpers/app.html').render(
            {'this': app_data, 'allow_delete': true, 'allow_reorder': true, 'tag': 'li'}));
        $('.main ul.apps').append($app);

        requests.post(
            urls.api.url('add_app', [collection.id]),
            {'app': app}
        ).done(function(data) {
            // A bit of cache rewriting.
            collection.apps.push(app_data);

            update_sort();  // Add event handlers for sorting.
            notification.notification({message: gettext('App added to collection.')});

        }).fail(function() {
            $app.remove();
            notification.notification({message: gettext('Failed to add app.')});
        });

    }).on('click', '.delete_collection', function(e) {
        e.preventDefault();

        var $this = $(this);
        var $spinner = $('<div class="spinner">');
        $this.replaceWith($spinner);

        notification.confirmation({
            message: gettext('Are you sure you want to delete this collection?')
        }).then(function() {
            var collection = get_collection();

            requests.del(urls.api.url('collection', [collection.id])).done(function() {
                // Rewrite the cache to remove the collection.
                collection_model.del(collection.id);
                cache.bust(urls.api.url('collection', [collection.id]));
                cache.attemptRewrite(
                    function(key) {
                        return utils.baseurl(key) == urls.api.unsigned.url('collections');
                    },
                    function(entry, key) {
                        for (var coll in entry.objects) {
                            if (entry.objects[coll].id === collection.id) {
                                entry.objects.splice(coll, 1);
                                break;
                            }
                        }
                        return entry;
                    }
                );

                notification.notification({message: gettext('Collection deleted.')});
                z.page.trigger('navigate', [urls.reverse('homepage')]);

            }).fail(function() {
                notification.notification({message: gettext('Failed to delete collection.')});
            });

        }, function() {
            $spinner.replaceWith($this);
        });

    }).on('sortupdate', 'ul.apps', function(e) {
        var app_elements = document.querySelectorAll('#app-list .app');
        var apps = Array.prototype.slice.call(app_elements).map(function(v) {
            return parseInt(v.getAttribute('data-id'), 10);
        });
        requests.post(
            urls.api.url('reorder_apps', [get_collection().id]),
            apps
        ).done(function() {
            notification.notification({message: gettext('Order updated')});
        }).fail(function() {
            notification.notification({message: gettext('Failed to update collection order. Try refreshing the page.')});
        });
    });

    // Code to update fields as they're edited by the user.
    z.page.on('updated', '.main .field', function(e, value) {
        var collection = get_collection();
        var $field = $(this);
        var $label = $field.find('p');
        var field = $field.data('field');
        var orig_html = $label.html();

        var data = {};
        data[field] = value;

        switch (field) {
            case 'region':
            case 'carrier':
            case 'category':
                // Look up the name of the new value and update the field.
                var model = models(field).lookup(data[field]);
                $label.text(model && model.name || '--');
                break;
            case 'description':
                if (navigator.l10n.language in value) {
                    $label.text(value[navigator.l10n.language]);
                } else {
                    $label.text(value[value.keys()[0]]);
                }
                break;
            case 'background_color':
            case 'text_color':
                $label.html(
                    '<span class="chiclet" style="background-color:' +
                    utils.escape_(value) +
                    '"></span> ' +
                    utils.escape_(value)
                );
                break;
            default:
                $label.text(value);
        }
        $field.addClass('saving');

        requests.patch(
            urls.api.url('collection', collection.id),
            data
        ).done(function(data) {
            notification.notification(
                {message: gettext('Saved {field}', {'field': field})});

        }).fail(function() {
            $label.html(orig_html);  // Reset the field text.
            notification.notification(
                {message: gettext('Failed to update {field}', {'field': field})});

        }).always(function() {
            $field.removeClass('saving');
        });
    });

    function apply_incompat(base_region, app_list) {
        var region_slug = models('region').lookup(base_region).slug;
        app_list.forEach(function(v) {
            for (var r in v.regions) {
                if (v.regions[r].slug === region_slug) {
                    return;
                }
            }
            var $app = $('.app[data-id="' + v.id + '"]');
            if ($app.data('incompatible')) {
                return;
            }
            $app.append(
                '<p class="incompatible">' +
                gettext("Incompatible: App not available in the collection's region."));
        });

    }

    return function(builder, params) {
        builder.start(
            'collection.html',
            {id: params[0]}
        );

        builder.onload('main', function(data) {
            data.apps.forEach(function(v) {
                app_model.cast(v);
            });

            if (data.region) {
                apply_incompat(data.region, data.apps);
            }
        });

        builder.z('type', 'leaf');
        builder.z('title', gettext('Collection'));

        builder.done(function() {
            update_sort();
        });
    };
});
