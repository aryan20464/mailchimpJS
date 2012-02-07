(function() {
  var MailChimpAPI;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  MailChimpAPI = (function() {
    var baseUrl, debug, forceConfirm;

    debug = true;

    forceConfirm = false;

    baseUrl = null;

    function MailChimpAPI(apikey, callback) {
      var accessToken, datacenter, url;
      datacenter = apikey.match(/-(.+)/)[1];
      accessToken = apikey.match(/(.+)-/)[1];
      baseUrl = "https://" + datacenter + ".api.mailchimp.com/1.3/?apikey=" + accessToken + "&";
      url = baseUrl + "method=lists";
      $.ajax({
        url: url,
        type: "POST",
        success: __bind(function(response) {
          if (response.error) {
            return callback({
              success: false,
              code: response.code,
              issue: response.error
            });
          } else {
            return callback({
              success: true
            });
          }
        }, this),
        error: __bind(function(xhr) {
          return callback({
            success: false,
            code: 101,
            issue: "Wrong datacenter."
          });
        }, this)
      });
    }

    MailChimpAPI.prototype.readLists = function(callback) {
      var listsObj, url;
      listsObj = [];
      url = baseUrl + "method=lists";
      return $.post(url, __bind(function(response) {
        var list, lists, _i, _len, _results;
        if (response.error) {
          callback({
            success: false,
            code: response.code,
            issue: response.error
          });
          return;
        }
        lists = response.data;
        _results = [];
        for (_i = 0, _len = lists.length; _i < _len; _i++) {
          list = lists[_i];
          _results.push(this.getListGroups(list, listsObj, function(response) {
            if (!response.success) {
              callback(response);
              return;
            }
            if (listsObj.length === lists.length) {
              return callback({
                success: true,
                object: listsObj
              });
            }
          }));
        }
        return _results;
      }, this));
    };

    MailChimpAPI.prototype.getListGroups = function(list, listsObj, callback) {
      var newList, url;
      newList = {
        Name: list.name,
        ID: list.id,
        Groups: {}
      };
      url = baseUrl + "method=listInterestGroupings&id=" + list.id;
      return $.post(url, __bind(function(groupings) {
        var group, grouping, _i, _j, _len, _len2, _ref;
        if (groupings.error && groupings.code !== 211) {
          callback({
            success: false,
            code: groupings.code,
            issue: groupings.error
          });
        }
        for (_i = 0, _len = groupings.length; _i < _len; _i++) {
          grouping = groupings[_i];
          newList.Groups[grouping.name] = [];
          _ref = grouping.groups;
          for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
            group = _ref[_j];
            newList.Groups[grouping.name].push(group.name);
          }
        }
        listsObj.push(newList);
        return callback({
          success: true
        });
      }, this));
    };

    MailChimpAPI.prototype.createGroup = function(listId, groupingName, groupName, callback) {
      var groupingIds, url;
      url = baseUrl + "method=listInterestGroupings&id=" + listId;
      groupingIds = {};
      return $.post(url, __bind(function(response) {
        var grouping, url2, _i, _len;
        if (response.error && response.code === !211) {
          callback({
            success: false,
            code: response.code,
            issue: response.error
          });
          return;
        }
        for (_i = 0, _len = response.length; _i < _len; _i++) {
          grouping = response[_i];
          groupingIds[grouping.name] = grouping.id;
        }
        if (groupingName in groupingIds) {
          url2 = baseUrl + "method=listInterestGroupAdd" + "&id=" + listId + "&grouping_id=" + groupingIds[groupingName] + "&group_name=" + groupName;
          return $.post(url2, __bind(function(response) {
            if (response.error && response.code !== 270) {
              callback({
                success: false,
                code: response.code,
                issue: response.error
              });
              return;
            }
            return callback({
              success: true
            });
          }, this));
        } else {
          url2 = baseUrl + "method=listInterestGroupingAdd" + "&id=" + listId + "&name=" + groupingName + "&type=checkboxes" + "&groups[]=" + groupName;
          return $.post(url2, __bind(function(response) {
            if (response.error) {
              callback({
                success: false,
                code: response.code,
                issue: response.error
              });
              return;
            }
            return callback({
              success: true
            });
          }, this));
        }
      }, this));
    };

    MailChimpAPI.prototype.deleteGroup = function(listId, groupingName, groupName, callback) {
      var groupings, url;
      groupings = {};
      url = baseUrl + "method=listInterestGroupings&id=" + listId;
      return $.post(url, __bind(function(response) {
        var grouping, url2, _i, _len;
        if (response.error) {
          callback(false);
          return;
        }
        for (_i = 0, _len = response.length; _i < _len; _i++) {
          grouping = response[_i];
          groupings[grouping.name] = grouping.id;
        }
        url2 = baseUrl + "method=listInterestGroupDel" + "&id=" + listId + "&grouping_id=" + groupings[groupingName] + "&group_name=" + groupName;
        return $.post(url2, __bind(function(response) {
          if (response.error) {
            callback({
              success: false,
              code: response.code,
              issue: response.error
            });
            return;
          }
          return callback({
            success: true
          });
        }, this));
      }, this));
    };

    MailChimpAPI.prototype.readContacts = function(listId, callback) {
      var contacts, url;
      contacts = [];
      url = baseUrl + "method=listMembers&id=" + listId + "&limit=15000";
      return $.post(url, __bind(function(response) {
        var contact, _i, _len, _ref;
        if (response.error) {
          callback({
            success: false,
            code: response.code,
            issue: response.error
          });
          return;
        }
        _ref = response.data;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          contact = _ref[_i];
          contacts.push(contact.email);
        }
        return callback({
          success: true,
          object: contacts
        });
      }, this));
    };

    MailChimpAPI.prototype.createContact = function(listId, contactJson, callback) {
      return this.doContact(listId, contactJson, true, callback);
    };

    MailChimpAPI.prototype.updateContact = function(listId, contactJson, callback) {
      return this.doContact(listId, contactJson, false, callback);
    };

    MailChimpAPI.prototype.readContact = function(listId, contactJson, callback) {
      var extraAttributes, key;
      extraAttributes = [];
      for (key in contactJson) {
        if (key !== "Email" && key !== "Groups") extraAttributes.push(key);
      }
      return this.ensureAttributes(listId, extraAttributes, __bind(function(response) {
        var url;
        if (!response.success) {
          callback(response);
          return;
        }
        url = baseUrl + "method=listMemberInfo" + "&id=" + listId + "&email_address=" + contactJson.Email;
        return $.post(url, __bind(function(response2) {
          var attribute, grouping, newContact, newDict, _i, _j, _len, _len2, _ref;
          if (response2.errors) {
            callback({
              success: false,
              code: 101,
              issue: response2.data[0].error
            });
            return;
          }
          newContact = contactJson;
          for (_i = 0, _len = extraAttributes.length; _i < _len; _i++) {
            attribute = extraAttributes[_i];
            newContact[attribute] = response2.data[0].merges[response.object[attribute]];
          }
          newContact.Groups = [];
          _ref = response2.data[0].merges.GROUPINGS;
          for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
            grouping = _ref[_j];
            newDict = {};
            newDict[grouping.name] = grouping.groups.split(", ");
            newContact.Groups.push(newDict);
          }
          return callback({
            success: true,
            object: newContact
          });
        }, this));
      }, this));
    };

    MailChimpAPI.prototype.deleteContact = function(listId, email, callback) {
      var url;
      url = baseUrl + "method=listUnsubscribe&id=" + listId + "&email_address=" + email + "&delete_member=true";
      return $.post(url, __bind(function(response) {
        if (response.error) {
          callback({
            success: false,
            code: response.code,
            issue: response.error
          });
          return;
        }
        return callback({
          success: true
        });
      }, this));
    };

    MailChimpAPI.prototype.doContact = function(listId, contactJson, isNew, callback) {
      var extraAttributes, key;
      extraAttributes = [];
      for (key in contactJson) {
        if (key !== "Email" && key !== "Groups") extraAttributes.push(key);
      }
      return this.ensureAttributes(listId, extraAttributes, __bind(function(response) {
        var attributes, counter, group, key, url, value, _i, _len, _ref;
        if (!response.success) {
          callback(response);
          return;
        }
        url = baseUrl + "method=list";
        url += isNew ? "Subscribe" : "UpdateMember";
        url += "&id=" + listId + "&email_address=" + encodeURI(contactJson.Email) + "&double_optin=" + (forceConfirm ? "true" : "false");
        attributes = response.object;
        for (key in attributes) {
          value = attributes[key];
          if (key in contactJson) {
            url += "&merge_vars[" + value + "]=" + encodeURI(contactJson[key]);
          }
        }
        counter = 0;
        _ref = contactJson.Groups;
        for (key in _ref) {
          value = _ref[key];
          url += "&merge_vars[GROUPINGS][" + counter + "][name]=" + encodeURI(key);
          url += "&merge_vars[GROUPINGS][" + counter++ + "][groups]=";
          for (_i = 0, _len = value.length; _i < _len; _i++) {
            group = value[_i];
            url += encodeURI(group.replace(",", "\\,")) + ",";
          }
          url = url.substring(0, url.length - 1);
        }
        return $.post(url, __bind(function(response2) {
          if (response2.error) {
            callback({
              success: false,
              code: response2.code,
              issue: response2.error
            });
            return;
          }
          return callback({
            success: true
          });
        }, this));
      }, this));
    };

    MailChimpAPI.prototype.ensureAttributes = function(listId, reqdAttributes, callback) {
      var url;
      url = baseUrl + "method=listMergeVars" + "&id=" + listId;
      return $.post(url, __bind(function(mergeVars) {
        var attributeToAdd, attributes, attributesAdded, attributesToAdd, mergeVar, reqdAttribute, tag, url2, _i, _j, _k, _len, _len2, _len3, _results;
        if (mergeVars.error) {
          callback({
            success: false,
            code: mergeVars.code,
            issue: mergeVars.error
          });
          return;
        }
        attributesToAdd = [];
        attributes = {};
        for (_i = 0, _len = mergeVars.length; _i < _len; _i++) {
          mergeVar = mergeVars[_i];
          attributes[mergeVar.name] = mergeVar.tag;
        }
        for (_j = 0, _len2 = reqdAttributes.length; _j < _len2; _j++) {
          reqdAttribute = reqdAttributes[_j];
          if (!(reqdAttribute in attributes)) attributesToAdd.push(reqdAttribute);
        }
        if (attributesToAdd.length === 0) {
          callback({
            success: true,
            object: attributes
          });
        }
        attributesAdded = 0;
        _results = [];
        for (_k = 0, _len3 = attributesToAdd.length; _k < _len3; _k++) {
          attributeToAdd = attributesToAdd[_k];
          tag = attributeToAdd.toUpperCase().replace(/[^A-Z0-9_]+/g, '').replace(/\s+/g, '');
          tag = tag.substring(0, 8) + Math.floor(Math.random() * 99);
          url2 = baseUrl + "method=listMergeVarAdd&id=" + "&id=" + listId + "&name=" + encodeURI(attributeToAdd) + "&tag=" + tag;
          _results.push($.post(url2, __bind(function(response) {
            if (response.error) {
              callback({
                success: false,
                code: response.code,
                issue: response.error
              });
              return;
            }
            if (++attributesAdded === attributesToAdd.length) {
              attributes[attributeToAdd] = tag;
              return callback({
                success: true,
                object: attributes
              });
            }
          }, this)));
        }
        return _results;
      }, this));
    };

    MailChimpAPI.prototype.log = function(str) {
      if (debug) return console.log(str);
    };

    return MailChimpAPI;

  })();

  window.MailChimpAPI = MailChimpAPI;

}).call(this);
