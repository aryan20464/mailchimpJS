#
# JavaScript MailChimp API Wrapper
#
# Copyright 2012 Ecquire Inc.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

class MailChimpAPI

    # Outputs debug messages when true
    debug = true

    # Allows contacts to be added to list with a confirmation email when false
    forceConfirm = false

    # Url that all API requests are based off (with access token)
    baseUrl = null

    # Set up authentication, and check for a valid apikey string
    constructor: (apikey,callback) ->
        datacenter = apikey.match(/-(.+)/)[1]
        accessToken = apikey.match(/(.+)-/)[1]
        baseUrl = "https://"+datacenter+".api.mailchimp.com/1.3/?apikey="+accessToken+"&"

        # Test to see if the provided api key is correct and working
        url = baseUrl+"method=lists"
        $.ajax
            url:url,
            type:"POST",
            success: (response) =>
                if response.error
                    callback {success:false,code:response.code,issue:response.error}
                else
                    callback {success:true}
            error: (xhr) =>
                callback {success:false,code:101,issue:"Wrong datacenter."}

    # Returns an array of all the lists a user has in the following format:
    #
    # [
    #   {
    #     "Name": "Example List",
    #     "ID": "123abc",
    #     "Groups": {
    #       "Location": [           // Grouping name
    #         "East Coast",         // Group name
    #         "West Coast",         // Group name
    #         ...
    #       ],
    #       ...
    #     }
    #   }
    #   ...
    # ]
    readLists: (callback) ->
        listsObj = []

        # Basic retrieval, no data is being passed
        url = baseUrl+"method=lists"

        $.post url, (response) =>

            if response.error
                callback({success:false,code:response.code,issue:response.error})
                return

            lists = response.data
            for list in lists
                
                @getListGroups list, listsObj, (response) ->
                   
                    if !response.success
                        callback(response)
                        return

                    # Finish if groups for all lists are retrieved
                    if listsObj.length is lists.length
                        callback({success:true,object:listsObj})


    # Adds the groupings and group names for a list (list), and appends it to
    # an array of lists (listsObj)
    getListGroups: (list, listsObj, callback) ->

        # Create the list skeleton
        newList = {Name:list.name,ID:list.id,Groups:{}}
        
        url = baseUrl+"method=listInterestGroupings&id="+list.id
        
        $.post url, (groupings) =>

            if groupings.error && groupings.code!=211
                callback({success:false,code:groupings.code,issue:groupings.error})
            
            # Construct an array entry for each grouping
            for grouping in groupings
                newList.Groups[grouping.name] = []
                for group in grouping.groups
                    newList.Groups[grouping.name].push(group.name)

            # Add the new list to the array of lists
            listsObj.push(newList)
            callback({success:true})

    # Create a new group with groupName under the grouping groupingName
    createGroup: (listId, groupingName, groupName, callback) ->

        url = baseUrl+"method=listInterestGroupings&id="+listId
        groupingIds = {}

        # First get a list of all the groupings to know which grouping to add to
        $.post url, (response) =>
            
            if response.error and response.code is not 211
                callback({success:false,code:response.code,issue:response.error})
                return
            
            for grouping in response
                groupingIds[grouping.name] = grouping.id
            
            # If the grouping already exists, add a new group to it
            if groupingName of groupingIds

                url2 = baseUrl+"method=listInterestGroupAdd"+
                               "&id="+listId+
                               "&grouping_id="+groupingIds[groupingName]+
                               "&group_name="+groupName

                $.post url2, (response) =>
                    
                    if response.error && response.code!=270
                        callback({success:false,code:response.code,issue:response.error})
                        return

                    callback({success:true})

            # Otherwise create a new grouping
            else
                url2 = baseUrl+"method=listInterestGroupingAdd"+
                               "&id="+listId+
                               "&name="+groupingName+
                               "&type=checkboxes"+
                               "&groups[]="+groupName

                $.post url2, (response) =>

                    if response.error
                        callback({success:false,code:response.code,issue:response.error})
                        return
                    
                    callback({success:true})

    # Delete an interest group from a grouping
    deleteGroup: (listId, groupingName, groupName, callback) ->
        
        groupings = {}

        # First get all the grouping ids
        url = baseUrl+"method=listInterestGroupings&id="+listId
        $.post url, (response) =>
            
            if response.error
                callback(false)
                return
            
            for grouping in response
                groupings[grouping.name] = grouping.id

            url2 = baseUrl+"method=listInterestGroupDel"+
                           "&id="+listId+
                           "&grouping_id="+groupings[groupingName]+
                           "&group_name="+groupName
            
            # Now delete the group under the specific grouping
            $.post url2, (response) =>
                
                if response.error
                    callback({success:false,code:response.code,issue:response.error})
                    return
                
                callback({success:true})

    # Returns an array of all the contact emails
    readContacts: (listId, callback) ->
        
        contacts = []
        url = baseUrl+"method=listMembers&id="+listId+"&limit=15000"
        $.post url, (response) =>

            if response.error
                callback({success:false,code:response.code,issue:response.error})
                return
            
            for contact in response.data
                contacts.push contact.email
            
            callback({success:true,object:contacts})

    # Create a new contact with the provided information in contactJson
    #
    # Format of "contactJson"
    #
    # {
    #   Email: "test@example.com",
    #   Groups: {
    #     "Location": [
    #       "East Coast",
    #       ...
    #     ],
    #     ...
    #   }
    #   Phone: "123-456-7890"
    #   Employer: "Ecquire"
    #   Note: "Met last Tuesday for coffee"
    # }
    #
    # Things to note: only Email is required (and must be capitalized). Fields
    # with spaces are permitted. Any field that is not present in the MailChimp
    # list will automatically be created as a merge var.
    createContact: (listId,contactJson,callback) ->
        @doContact(listId,contactJson,true,callback)

    # Update an existing contact with the provided information
    updateContact: (listId,contactJson,callback) ->
        @doContact(listId,contactJson,false,callback)
 
    # Given an empty contactJson (except for the email) with the attributes
    # desired, return a filled contactJson 
    readContact: (listId, contactJson, callback) ->

        extraAttributes = []
        for key of contactJson when key!="Email" and key!="Groups"
            extraAttributes.push(key)

        @ensureAttributes listId,extraAttributes, (response) =>

            if !response.success
                callback(response)
                return


            url = baseUrl+"method=listMemberInfo"+
                          "&id="+listId+
                          "&email_address="+contactJson.Email

            $.post url, (response2) =>

                if response2.errors
                    callback({success:false,code:101,issue:response2.data[0].error})
                    return

                newContact = contactJson
                
                # Add any extra attributes from the returned merge variables
                for attribute in extraAttributes
                    newContact[attribute] = response2.data[0].merges[ response.object[attribute] ]
                
                newContact.Groups = []
                for grouping in response2.data[0].merges.GROUPINGS
                    newDict = {}
                    newDict[grouping.name] = grouping.groups.split(", ")
                    newContact.Groups.push( newDict )

                callback({success:true,object:newContact})
   
    # Delete an existing contact with the provided information
    deleteContact: (listId,email,callback) ->
        
        url = baseUrl+"method=listUnsubscribe&id="+listId+"&email_address="+email+"&delete_member=true"
        $.post url, (response) =>

            if response.error
                callback({success:false,code:response.code,issue:response.error})
                return

            callback({success:true})

    # Either adds or edits a contact in a list
    doContact: (listId,contactJson,isNew,callback) ->

        extraAttributes = []
        for key of contactJson when key!="Email" and key!="Groups"
            extraAttributes.push(key)

        # Make sure that the list contains all the merge vars we need, and if
        # not then add them using the ensureAttributes method
        @ensureAttributes listId,extraAttributes, (response) =>

            if !response.success
                callback(response)
                return
            
            # Otherwise build the URL to add the contact
            url = baseUrl + "method=list" 
            url += if isNew then "Subscribe" else "UpdateMember"
            url +=  "&id="+listId+
                    "&email_address="+encodeURI(contactJson.Email)+
                    "&double_optin=" + (if forceConfirm then "true" else "false")

            attributes = response.object
            for key,value of attributes when key of contactJson
                url += "&merge_vars["+value+"]="+encodeURI(contactJson[key])

            # Add the contact's groups to the URL
            counter = 0
            for key,value of contactJson.Groups
                url += "&merge_vars[GROUPINGS][" + counter + "][name]="+ encodeURI(key)
                url += "&merge_vars[GROUPINGS][" + counter++ + "][groups]="
                for group in value
                    url += encodeURI(group.replace(",","\\,"))+","
                url = url.substring(0,url.length-1)
                
            # Finally add the contact to the list
            $.post url, (response2) =>

                if response2.error
                    callback({success:false,code:response2.code,issue:response2.error})
                    return

                callback({success:true})

    # Makes sure that a given list has the attributes specified, and returns an
    # array of the attribute and its MailChimp tag
    ensureAttributes: (listId,reqdAttributes,callback) ->

        url = baseUrl+"method=listMergeVars"+
                      "&id="+listId
        $.post url, (mergeVars) =>

            if mergeVars.error
                callback({success:false,code:mergeVars.code,issue:mergeVars.error})
                return

            attributesToAdd = []
            attributes = {}

            for mergeVar in mergeVars
                attributes[mergeVar.name] = mergeVar.tag

            for reqdAttribute in reqdAttributes when reqdAttribute not of attributes
                attributesToAdd.push(reqdAttribute)

            if attributesToAdd.length is 0
                callback({success:true,object:attributes})

            attributesAdded = 0
            for attributeToAdd in attributesToAdd
                tag = attributeToAdd.toUpperCase().replace(/[^A-Z0-9_]+/g,'').replace(/\s+/g,'')
                tag = tag.substring(0,8) + Math.floor(Math.random()*99)

                url2 = baseUrl+ "method=listMergeVarAdd&id="+
                                "&id="+listId+
                                "&name="+encodeURI(attributeToAdd)+
                                "&tag="+tag

                $.post url2, (response) =>

                    if response.error
                        callback({success:false,code:response.code,issue:response.error})
                        return

                    if ++attributesAdded is attributesToAdd.length
                        attributes[attributeToAdd] = tag
                        callback({success:true,object:attributes})

    # Only log if debugging
    log: (str) ->
        if debug then console.log(str)

window.MailChimpAPI = MailChimpAPI
