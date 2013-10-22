define('views/collection',
    ['cache', 'jquery', 'l10n', 'log', 'models', 'notification', 'requests', 'templates', 'urls', 'utils', 'z', 'lib/html5sortable.jquery'],
    function(cache, $, l10n, log, models, notification, requests, nunjucks, urls, utils, z) {

    var console = log('collection');

    var gettext = l10n.gettext;
    var collection_model = models('collection');
    var app_model = models('app');

    // msgs.boolean_key_name.state
    var msgs = {
        is_public: {
            disable: gettext('Make Collection Hidden'),
            enable: gettext('Make Collection Public'),
            nowDisabled: gettext('Collection is now hidden'),
            nowEnabled: gettext('Collection is now public'),
            failed: gettext('Setting collection public property failed')
        },
        can_be_hero: {
            enable: gettext('Enable "hero" flag'),
            disable: gettext('Disable "hero" flag'),
            nowEnabled: gettext('The "hero" flag is now enabled'),
            nowDisabled: gettext('The "hero" flag is now disabled'),
            failed: gettext('Setting collection "hero" property failed')
        }
    };

    function get_collection() {
        return collection_model.lookup($('.main').data('id'));
    }

    function update_sort() {
        $('ul.apps').sortable({handle: '.handle'});
    }

    function update_toggle($elm, data) {
        var $b = $elm.find('b').detach();
        var key = $elm.data('key');

        if (data[key]) {
            $elm.removeClass('offstate').text(' ' + msgs[key].disable).prepend($b);
        } else {
            $elm.addClass('offstate').text(' ' + msgs[key].enable).prepend($b);
        }
    }

    z.page.on('click', 'a.show-dialog', function(e) {
        e.preventDefault();
        $('.dialog').addClass('hidden');
        $('#' + $(this).data('dialog')).removeClass('hidden');

    }).on('click', '.dialog .close', function(e) {
        e.preventDefault();
        $('.dialog').addClass('hidden');
    });

    z.page.on('submit', '#duplicate_collection form', function(e) {
        e.preventDefault();

        var $this = $(this);
        var data = utils.getVars($this.serialize());

        var $button = $this.find('.button');
        var button_text = $button.text();
        $button.addClass('disabled').html('<div class="spinner">');

        requests.post(
            urls.api.url('duplicate', [get_collection().id]),
            data
        ).then(function(data) {
            collection_model.cast(data);

            notification.notification({message: gettext('Successfully duplicated')});
            z.page.trigger('navigate', [urls.reverse('collection', [data.slug])]);

        }, function() {
            notification.notification({message: gettext('Failed to duplicate collection')})

        }).always(function() {
            $button.removeClass('disabled').text(button_text);
        });

    }).on('submit', '#app_search form', function(e) {
        e.preventDefault();

        var list = $('#app_search_results');
        list.html('<li class="spinner with-some-padding">');
        requests.get(
            utils.urlparams(
                urls.api.url('search'),
                {'q': $('#app_search input[type=search]').val(),
                 'region': 'None'}
            )
        ).then(function(data) {
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

            apply_incompat(get_collection().region, data.objects);
        }, function() {
            notification.notification({message: gettext('Search failed :-(')});
        });

    }).on('submit', '#add-curator form', function(e) {
        e.preventDefault();

        var $this = $(this);

        var $button = $this.find('.button');
        var button_text = $button.text();
        $button.addClass('disabled').html('<div class="spinner">');

        var uid = $this.find('[name=uid]').val();
        requests.post(
            urls.api.url('add_curator', [get_collection().id]),
            {user: uid}
        ).then(function(data) {
            $this.find('input').val('');

            var curator;
            for(var i = 0; i < data.length; i++) {
                if (data[i].id == uid) {
                    curator = data[i];
                    break;
                }
            }
            if (!curator) {
                // Uh oh, pinning issues!
                notification.notification({message: gettext('Curator added; check back in a bit')});
                return;
            }

            notification.notification({message: gettext('Added curator')});

            var $curators = $('.curators');
            var $sorry = $curators.find('.sorry');
            if ($sorry.length) {
                $sorry.remove();
                $curators.find('h2').after('<ul>');
            }
            $curators.find('ul').append(
                nunjucks.env.getTemplate('helpers/curator.html').render({
                    'curator': curator,
                    'curator_color': function() {return 'black';}
                })
            );
        }, function() {
            notification.notification({message: gettext('Failed to add curator')});
        }).always(function() {
            $button.removeClass('disabled').text(button_text);
        });

    }).on('click', '.curators li .delete', function(e) {
        e.preventDefault();
        var $curator = $(this).parent();
        $curator.hide();
        var curator_id = $curator.data('id');

        requests.post(
            urls.api.url('remove_curator', [get_collection().id]),
            {user: curator_id}
        ).then(function() {
            $curator.remove();
            notification.notification({message: gettext('Removed curator')});

        }, function() {
            $curator.show();
            notification.notification({message: gettext('Failed to remove curator')});
        });

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
        ).then(function() {
            // Do some cache rewriting.
            collection.apps = collection.apps.filter(function(coll_app) {
                return coll_app.id != app.id;
            });

            $app.remove();

            notification.notification({message: gettext('Removed {app} from collection.', {app: app.name})});

        }, function() {
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
        apply_incompat(collection.region, [app_data]);

        requests.post(
            urls.api.url('add_app', [collection.id]),
            {'app': app}
        ).then(function(data) {
            // A bit of cache rewriting.
            collection.apps.push(app_data);

            update_sort();  // Add event handlers for sorting.
            notification.notification({message: gettext('App added to collection.')});

        }, function() {
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

            requests.del(urls.api.url('collection', [collection.id])).then(function() {
                // Rewrite the cache to remove the collection.
                collection_model.del(collection.id);
                cache.bust(urls.api.url('collection', [collection.id]));
                var list_endpoint = urls.api.unsigned.url('collections');
                cache.attemptRewrite(
                    function(key) {
                        return utils.baseurl(key) == list_endpoint;
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

            }, function() {
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
        ).then(function() {
            notification.notification({message: gettext('Order updated')});
        }, function() {
            notification.notification({message: gettext('Failed to update collection order. Try refreshing the page.')});
        });

    }).on('click', '.toggle-flag', function(e) {
        e.preventDefault();
        var collection = get_collection();
        var $this = $(this);
        var key = $this.data('key');
        var successMsg = msgs[key].nowEnabled;
        var data = {};

        data[key] = false;

        $this.addClass('saving');

        if ($this.hasClass('offstate')) { // Enable flag.
            data[key] = true;
        } else { // Disable flag.
            successMsg = msgs[key].nowDisabled;
        }

        requests.patch(
            urls.api.url('collection', collection.id),
            data
        ).then(function() {
            update_toggle($this, data);
            notification.notification({message: successMsg});
        }, function() {
            notification.notification(
                {message: msgs[key].failed});
        }).always(function() {
            $this.removeClass('saving');
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
            case 'carrier':
                // "carrierless" -> NULL
                if (value === 'carrierless') {
                    data[field] = '';
                }
            case 'region':
            case 'category':
                // Look up the name of the new value and update the field.
                var model = models(field).lookup(value);
                $label.text(model && model.name ||
                            (field === 'category' ?
                             gettext('All Categories (Homepage)') : '--'));
                break;
            case 'name':
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
        ).then(function(data) {
            // Update the cache.
            collection_model.cast(data);

            notification.notification(
                {message: gettext('Saved {field}', {'field': field})});

            if (field === 'slug') {
                // If we changed the slug, go to the new URL.
                z.page.trigger('divert', [urls.reverse('collection', [data.slug])]);
            }
            // TODO: Trigger a views.reload() here?

        }, function() {
            $label.html(orig_html);  // Reset the field text.
            notification.notification(
                {message: gettext('Failed to update {field}', {'field': field})});

        }).always(function() {
            $field.removeClass('saving');
        });
    });

    function apply_incompat(region_slug, app_list) {
        if (!region_slug) {
            // Don't show incompat if the region is null.
            return;
        }
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
            $app.data('incompatible', true);
            $app.append(
                '<p class="incompatible">' +
                gettext("Incompatible: App not available in the collection's region."));
        });
    }

    z.body.on('change', '.image-upload input[type=file]', function(e) {
        apply_uploaded_file(e.target.files);

    }).on('dragover', '.drop-target', function(e) {
        e.preventDefault();
        $(this).addClass('hover');

    }).on('dragleave', '.drop-target', function(e) {
        e.preventDefault();
        $(this).removeClass('hover');

    }).on('drop', '.drop-target', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('hover');
        apply_uploaded_file(e.originalEvent.dataTransfer.files);
    });

    function get_image(src, callback) {
        var img = new Image();
        img.onload = function() {
            callback(img);
        };
        img.src = src;
    }

    function apply_uploaded_file(files) {
        var file = files[0];
        console.log('Got file change event: ', file.name, file.size);
        if (!file) {
            console.log('No file selected');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            get_image(
                e.target.result,
                function(img) {
                    draw_image(img, show_uploader(), true);
                }
            );
        };
        reader.readAsDataURL(file);
    }

    function show_uploader() {
        var uploader = $('.main .image-upload');
        uploader.find('.spinner').addClass('hidden');
        uploader.find('.loaded').removeClass('hidden');
        return uploader;
    }

    function draw_image(img, uploader, user) {
        console.log('Redrawing collection image');
        var old_canvas_el = uploader.find('canvas')[0];
        var canvas_el = document.createElement('canvas');
        canvas_el.innerHTML = old_canvas_el.innerHTML;
        var cw = canvas_el.width = old_canvas_el.width;
        var ch = canvas_el.height = old_canvas_el.height;
        old_canvas_el.parentNode.replaceChild(canvas_el, old_canvas_el);

        var canvas = canvas_el.getContext('2d');
        if (img) {
            // Hark! The logic for `background-size: cover`
            if (img.width / cw < img.height / ch) {
                var temp = cw / img.width * img.height;
                canvas.drawImage(img, 0, ch / 2 - temp / 2, cw, temp);
            } else {
                var temp = ch / img.height * img.width;
                canvas.drawImage(img, cw / 2 - temp / 2, 0, temp, ch);
            }
        } else {
            canvas.clearRect(0, 0, canvas_el.width, canvas_el.height);
            canvas.fillStyle = '#bbb';
            canvas.fillRect(0, 0, canvas_el.width, canvas_el.height);
            canvas.textAlign = 'center';
            canvas.fillStyle = '#000';
            canvas.font = '24px Arial, Helvetica, sans-serif';
            canvas.fillText(gettext('No Image Provided'), canvas_el.width / 2, canvas_el.height / 2 - 12);
        }

        uploader.find('.user').toggleClass('hidden', !user);
        uploader.find('.server').toggleClass('hidden', user || !img);
    }

    z.page.on('click', '.clear-image', function(e) {
        draw_image(null, show_uploader(), false);
        requests.del(
            urls.api.url('collection_image', [get_collection().id])
        ).then(function() {
            notification.notification({message: gettext('Image cleared')});
        }, function() {
            notification.notification({message: gettext('Could not clear image, probably bug 917081')});
        });

    }).on('click', '.save-image', function(e) {
        $('.image-upload .spinner').removeClass('hidden');
        $('.image-upload .loaded').addClass('hidden');

        requests.put(
            urls.api.url('collection_image', [get_collection().id]),
            new requests.RawData($('.image-upload canvas').get(0).toDataURL('image/png'))
        ).then(function() {
            notification.notification({message: gettext('Image saved')});
            show_uploader().find('.user, .server').addClass('hidden');
        }, function() {
            notification.notification({message: gettext('Could not save image')});
            show_uploader();
        });
    });

    return function(builder, params) {
        builder.start('collection.html', {id: params[0]});

        builder.onload('main', function(data) {
            // This might be/probably will be a slug, so change it to ID.
            $('.main').data('id', data.id);

            data.apps.forEach(function(v) {
                app_model.cast(v);
            });

            apply_incompat(data.region, data.apps);

            $('.toggle-flag').each(function() {
                update_toggle($(this), data);
            });

            // Everything from here down is image related, which doesn't apply to FACs.
            if (data.collection_type === 1) return;

            // Load in the collection image.
            if (data.image) {
                get_image(
                    urls.api.url('collection_image', [data.id]),
                    function(img) {
                        draw_image(img, show_uploader(), false);
                        $('.image-upload button.clear-image').on('click', function() {
                            data.image = null;
                            img = null;
                        });
                    }
                );
            } else {
                draw_image(null, show_uploader(), false);
            }
            // In general, you shouldn't do this, but this turns
            // out to be OK because the nodes involved will be
            // collected and the events are bound exactly once.
            $('.image-upload button.revert').on('click', function() {
                var img;
                function revert(img) {
                    draw_image(img, show_uploader(), false);
                }
                if (data.image) {
                    getImage(urls.api.url('collection_image', [data.id]), revert);
                } else {
                    revert(null);
                }
            });
        });

        builder.z('type', 'leaf');
        builder.z('title', gettext('Collection'));

        builder.done(update_sort);
    };
});
