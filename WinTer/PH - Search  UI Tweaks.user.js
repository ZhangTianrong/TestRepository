// ==UserScript==
// @name          PH - Search & UI Tweaks
// @namespace     brazenvoid
// @version       2.2.0
// @author        brazenvoid
// @license       GPL-3.0-only
// @description   Various search filters and user experience enhancers
// @include       https://*.pornhub.com/*
// @require       https://greasyfork.org/scripts/375557-base-resource/code/Base%20Resource.js?version=842141
// @grant         GM_addStyle
// @run-at        document-end
// ==/UserScript==

const PAGE_PATH_NAME = window.location.pathname

const IS_PLAYLIST_PAGE = PAGE_PATH_NAME.startsWith('/playlist')
const IS_PROFILE_PAGE = PAGE_PATH_NAME.startsWith('/model') || PAGE_PATH_NAME.startsWith('/channels') || PAGE_PATH_NAME.startsWith('/user')
const IS_VIDEO_PAGE = PAGE_PATH_NAME.startsWith('/view_video')
const IS_VIDEO_SEARCH_PAGE = PAGE_PATH_NAME.startsWith('/video')

const FILTER_BLACKLIST_KEY = 'Blacklist'
const FILTER_HD_VIDEOS_KEY = 'Show Only HD Videos'
const FILTER_PAID_VIDEOS_KEY = 'Hide Paid Videos'
const FILTER_PREMIUM_VIDEOS_KEY = 'Hide Premium Videos'
const FILTER_PRO_CHANNEL_VIDEOS_KEY = 'Hide Pro Channel Videos'
const FILTER_PRIVATE_VIDEOS_KEY = 'Hide Private Videos'
const FILTER_RATING_VIDEOS_KEY = 'Rating'
const FILTER_RECOMMENDED_VIDEOS_KEY = 'Hide Recommended Videos'
const FILTER_UNRATED_VIDEOS_KEY = 'Hide Unrated Videos'
const FILTER_VERIFIED_VIDEOS_KEY = 'Hide Verified Videos'
const FILTER_VIDEO_DURATION_KEY = 'Duration'
const FILTER_VIDEO_VIEWS_KEY = 'Views'
const FILTER_WATCHED_VIDEOS_KEY = 'Hide Watched Videos'

const LINK_DISABLE_PLAYLIST_CONTROLS_KEY = 'Disable Playlist Controls'
const LINK_USER_PUBLIC_VIDEOS_KEY = 'User Public Videos'

const OPTION_ALWAYS_SHOW_UI = 'Always Show This Settings Pane'
const OPTION_DISABLE_VIDEO_FILTERS = 'Disable All Video Filters'
const OPTION_SANITIZATION_KEY = 'Video Names Sanitization Rules'

const SCRIPT_PREFIX = 'ph-sui-'

const UI_REMOVE_IFRAMES = 'Remove Ad IFrames'
const UI_REMOVE_LIVE_MODELS_SECTIONS = 'Remove Live Models Sections'
const UI_REMOVE_PORN_STAR_SECTIONS = 'Remove Porn Star Sections'

class PHSearchAndUITweaks
{
    static initialize ()
    {
        return (new PHSearchAndUITweaks).init()
    }

    constructor ()
    {
        /**
         * Local storage store with defaults
         * @type {LocalStore}
         * @private
         */
        this._settingsStore = (new LocalStore(SCRIPT_PREFIX + 'settings', {
            blacklist: [],
            sanitize: {},
            duration: { // In Seconds
                minimum: 60,
                maximum: 0,
            },
            rating: {
                minimum: 70,
                maximum: 0,
            },
            views: {
                minimum: 0,
                maximum: 0,
            },
            disableVideoFilters: false,
            hideSDVideos: false,
            hidePaidVideos: false,
            hidePremiumVideos: false,
            hidePrivateVideos: false,
            hideProChannelVideos: false,
            hideRecommendedVideos: false,
            hideUnratedVideos: false,
            hideVerifiedVideos: false,
            hideWatchedVideos: true,
            linkDisablePlaylistControls: false,
            linkUserPublicVideos: false,
            removeIFrames: false,
            removeLiveModelsSections: false,
            removePornStarSections: false,
            showUIAlways: true,
        }))

        /**
         * @type {{hideSDVideos: boolean, removePornStarSections: boolean, disableVideoFilters: boolean, rating: {maximum: number, minimum: number}, blacklist: [],
         *     hideProChannelVideos: boolean, hideUnratedVideos: boolean, duration: {maximum: number, minimum: number}, removeLiveModelsSections: boolean, hideWatchedVideos:
         *     boolean, linkDisablePlaylistControls: boolean, linkUserPublicVideos: boolean, hideRecommendedVideos: boolean, hidePaidVideos: boolean, removeIFrames: boolean,
         *     showUIAlways: boolean, hidePrivateVideos: boolean, views: {maximum: number, minimum: number}, hidePremiumVideos: boolean, sanitize: {}}}
         * @private
         */
        this._settings = this._settingsStore.retrieve().get()

        /**
         * @type {StatisticsRecorder}
         * @private
         */
        this._statistics = new StatisticsRecorder(SCRIPT_PREFIX)

        /**
         * @type {UIGenerator}
         * @private
         */
        this._uiGen = new UIGenerator(this._settings.showUIAlways, SCRIPT_PREFIX)

        /**
         * @type {Validator}
         * @private
         */
        this._validator = (new Validator(this._statistics)).setBlacklist(this._settings.blacklist).setSanitizationRules(this._settings.sanitize)

        /**
         * @type {Function[]}
         * @private
         */
        this._videoFilters = [
            (videoItem) => this._validateWatchStatus(videoItem),
            (videoItem) => this._validateRating(videoItem),
            (videoItem) => this._validateDuration(videoItem),
            (videoItem) => this._validateViews(videoItem),
            (videoItem) => this._validateHD(videoItem),
            (videoItem) => this._validateVerifiedState(videoItem),
            (videoItem) => this._validateProfessionalChannelVideo(videoItem),
            (videoItem) => this._validatePaidVideo(videoItem),
            (videoItem) => this._validatePremiumVideo(videoItem),
            (videoItem) => this._validatePrivateVideo(videoItem),
            (videoItem) => this._validateRecommendedState(videoItem),
            (videoItem) => this._validator.validateBlackList(videoItem.querySelector('.title > a').textContent),
        ]
    }

    /**
     * Generates the settings UI
     * @private
     */
    _buildUI ()
    {
        let section = this._uiGen.createSection('this._settings', '#ffa31a', '5vh', '250px').
            addSectionChildren([
                this._uiGen.createTabsSection(['Videos', 'Global', 'Stats'], [
                    this._uiGen.createTabPanel('Videos', [
                        this._uiGen.createFormRangeInputGroup(FILTER_VIDEO_DURATION_KEY, 'number'),
                        this._uiGen.createFormRangeInputGroup(FILTER_RATING_VIDEOS_KEY, 'number'),
                        this._uiGen.createFormRangeInputGroup(FILTER_VIDEO_VIEWS_KEY, 'number'),
                        this._uiGen.createBreakSeparator(),
                        this._uiGen.createFormInputGroup(FILTER_HD_VIDEOS_KEY, 'checkbox', 'Hides videos of less than 720p resolution.'),
                        this._uiGen.createFormInputGroup(FILTER_PAID_VIDEOS_KEY, 'checkbox', 'Hide paid videos.'),
                        this._uiGen.createFormInputGroup(FILTER_PREMIUM_VIDEOS_KEY, 'checkbox', 'Hide Premium Only Videos.'),
                        this._uiGen.createFormInputGroup(FILTER_PRIVATE_VIDEOS_KEY, 'checkbox', 'Hide videos needing befriended status.'),
                        this._uiGen.createFormInputGroup(FILTER_PRO_CHANNEL_VIDEOS_KEY, 'checkbox', 'Hide videos from professional channels.'),
                        this._uiGen.createFormInputGroup(FILTER_RECOMMENDED_VIDEOS_KEY, 'checkbox', 'Hide recommended videos.'),
                        this._uiGen.createFormInputGroup(FILTER_UNRATED_VIDEOS_KEY, 'checkbox', 'Hide videos with 0% rating.'),
                        this._uiGen.createFormInputGroup(FILTER_VERIFIED_VIDEOS_KEY, 'checkbox', 'Hide videos from verified users, couples and models.'),
                        this._uiGen.createFormInputGroup(FILTER_WATCHED_VIDEOS_KEY, 'checkbox', 'Hide already watched videos.'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createFormTextAreaGroup(FILTER_BLACKLIST_KEY, 2, 'Hide videos with these comma separated words in their names.'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createFormInputGroup(OPTION_DISABLE_VIDEO_FILTERS, 'checkbox', 'Disables all video filters.'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createSettingsFormActions(this._settingsStore, () => this._onUIApplyClick()),
                    ]),
                    this._uiGen.createTabPanel('Global', [
                        this._uiGen.createFormTextAreaGroup(OPTION_SANITIZATION_KEY, 2,
                            'Censor video names by substituting offensive words. Each rule in separate line and target words must be comma separated. Example Rule: boyfriend=stepson,stepdad'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createFormSection('Link Manipulations', [
                            this._uiGen.createFormInputGroup(LINK_DISABLE_PLAYLIST_CONTROLS_KEY, 'checkbox', 'Disable playlist controls on video pages.'),
                            this._uiGen.createFormInputGroup(LINK_USER_PUBLIC_VIDEOS_KEY, 'checkbox', 'Jump directly to public videos on any profile link click.'),
                        ]),
                        this._uiGen.createSeparator(),
                        this._uiGen.createFormSection('UI Manipulations', [
                            this._uiGen.createFormInputGroup(UI_REMOVE_IFRAMES, 'checkbox', 'Removes all ad iframes.'),
                            this._uiGen.createFormInputGroup(UI_REMOVE_LIVE_MODELS_SECTIONS, 'checkbox', 'Remove live model stream sections from search.'),
                            this._uiGen.createFormInputGroup(UI_REMOVE_PORN_STAR_SECTIONS, 'checkbox', 'Remove porn star listing sections from search.'),
                        ]),
                        this._uiGen.createFormInputGroup(OPTION_ALWAYS_SHOW_UI, 'checkbox', 'Always show this interface.'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createSettingsFormActions(this._settingsStore, () => this._onUIApplyClick()),
                        this._uiGen.createSeparator(),
                        this._uiGen.createStoreFormSection(this._settingsStore),
                    ]),
                    this._uiGen.createTabPanel('Stats', [
                        this._uiGen.createStatisticsFormGroup(FILTER_BLACKLIST_KEY),
                        this._uiGen.createStatisticsFormGroup(FILTER_VIDEO_DURATION_KEY),
                        this._uiGen.createStatisticsFormGroup(FILTER_HD_VIDEOS_KEY, 'High Definition'),
                        this._uiGen.createStatisticsFormGroup(FILTER_PAID_VIDEOS_KEY, 'Paid Videos'),
                        this._uiGen.createStatisticsFormGroup(FILTER_PREMIUM_VIDEOS_KEY, 'Premium Videos'),
                        this._uiGen.createStatisticsFormGroup(FILTER_PRIVATE_VIDEOS_KEY, 'Private Videos'),
                        this._uiGen.createStatisticsFormGroup(FILTER_PRO_CHANNEL_VIDEOS_KEY, 'Pro Channel Videos'),
                        this._uiGen.createStatisticsFormGroup(FILTER_RATING_VIDEOS_KEY),
                        this._uiGen.createStatisticsFormGroup(FILTER_RECOMMENDED_VIDEOS_KEY, 'Recommended'),
                        this._uiGen.createStatisticsFormGroup(FILTER_UNRATED_VIDEOS_KEY, 'Unrated'),
                        this._uiGen.createStatisticsFormGroup(FILTER_VERIFIED_VIDEOS_KEY, 'Verified'),
                        this._uiGen.createStatisticsFormGroup(FILTER_VIDEO_VIEWS_KEY),
                        this._uiGen.createStatisticsFormGroup(FILTER_WATCHED_VIDEOS_KEY, 'Watched'),
                        this._uiGen.createSeparator(),
                        this._uiGen.createStatisticsTotalsGroup(),
                    ]),
                ]),
                this._uiGen.createStatusSection(),
            ])
        this._uiGen.constructor.appendToBody(section)
        this._uiGen.constructor.appendToBody(this._uiGen.createSettingsShowButton('', section, true, () => {
            if (!this._settings.showUIAlways) {
                section.style.display = 'none'
            }
        }))
        this._onSettingsStoreUpdate()
    }

    /**
     * Remove paid videos listing
     * @private
     */
    _complyPaidVideosSectionOnVideoPage ()
    {
        if (this._settings.hidePaidVideos) {
            let paidVideosList = document.querySelector('#p2vVideosVPage')
            if (paidVideosList) {
                paidVideosList.remove()
            }
        }
    }

    /**
     * Changes profile links to directly point to public video listings
     * @private
     */
    _complyProfileLinks ()
    {
        if (this._settings.linkUserPublicVideos) {
            let userProfileLinks = document.querySelectorAll('.usernameBadgesWrapper a, a.usernameLink, .usernameWrap a'), href
            for (let userProfileLink of userProfileLinks) {
                href = userProfileLink.getAttribute('href')
                if (href.startsWith('/channels') || href.startsWith('/model')) {
                    userProfileLink.setAttribute('href', href + '/videos')
                } else {
                    if (href.startsWith('/user')) {
                        userProfileLink.setAttribute('href', href + '/videos/public')
                    }
                }
            }
        }
    }

    /**
     * Filters recommended videos list
     * @private
     */
    _complyRecommendedVideosListOnVideoPage ()
    {
        let recommendedVideosLoadMoreButton = document.querySelector('.more_related_btn')
        recommendedVideosLoadMoreButton.removeAttribute('href')

        let recommendedVideosHandler = (waitIteration = 1) => {
            recommendedVideosLoadMoreButton.click()
            recommendedVideosLoadMoreButton.click()

            if (recommendedVideosLoadMoreButton.style.display !== 'none') {
                waitIteration += 1
                if (waitIteration < 30) {
                    sleep(1000).then(() => recommendedVideosHandler(waitIteration))
                }
            } else {
                this._complyVideoList(document.querySelector('#relateRecommendedItems'))
            }
        }
        if (document.querySelector('#relateRecommendedItems')) {
            sleep(2000).then(() => recommendedVideosHandler())
        }
    }

    /**
     * Filters videos as per settings
     * @param target
     * @private
     */
    _complyVideoList (target)
    {
        for (let videoItem of this._getVideoItemsFromVideoList(target)) {

            if (typeof videoItem.PHSUIProcessedOnce === 'undefined') {
                videoItem.PHSUIProcessedOnce = false
            }

            this._processVideoCompliance(videoItem)

            if (!videoItem.PHSUIProcessedOnce) {
                if (IS_PLAYLIST_PAGE) {
                    this._validatePlaylistVideoLink(videoItem)
                }
                this._validator.sanitizeVideoItem(videoItem.querySelector('.title > a'))
                videoItem.PHSUIProcessedOnce = true
            }

            this._statistics.updateUI()
        }
    }

    /**
     * Fixes left over space after ads removal
     * @private
     */
    _fixLeftOverSpaceOnVideoSearchPage ()
    {
        for (let div of document.querySelectorAll('.showingCounter, .tagsForWomen')) {
            div.style.height = 'auto'
        }
    }

    /**
     * Fixes pagination nav by moving it under video items list
     * @private
     */
    _fixPaginationNavOnVideoSearchPage ()
    {
        document.querySelector('.nf-videos').appendChild(document.querySelector('.pagination3'))
    }

    /**
     * @return {NodeListOf<Element>}
     * @private
     */
    _getVideoLists ()
    {
        return document.querySelectorAll('ul.videos')
    }

    /**
     * @param {Node|HTMLElement} videoList
     * @return {Node[]|HTMLElement[]}
     * @private
     */
    _getVideoItemsFromVideoList (videoList)
    {
        let videoItems = []
        if (videoList instanceof NodeList) {
            videoList.forEach((node) => {
                if (typeof node.classList !== 'undefined' && node.classList.contains('videoblock')) {
                    videoItems.push(node)
                }
            })
        } else {
            videoItems = videoList.querySelectorAll('.videoblock')
        }
        return videoItems
    }

    /**
     * Initializes settings UI again when settings store experiences any change
     * @private
     */
    _onSettingsStoreUpdate ()
    {
        let store = this._settingsStore.get()

        this._uiGen.setSettingsInputCheckedStatus(FILTER_HD_VIDEOS_KEY, store.hideSDVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_PAID_VIDEOS_KEY, store.hidePaidVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_PREMIUM_VIDEOS_KEY, store.hidePremiumVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_PRO_CHANNEL_VIDEOS_KEY, store.hideProChannelVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_PRIVATE_VIDEOS_KEY, store.hidePrivateVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_RECOMMENDED_VIDEOS_KEY, store.hideRecommendedVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_WATCHED_VIDEOS_KEY, store.hideWatchedVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_UNRATED_VIDEOS_KEY, store.hideUnratedVideos)
        this._uiGen.setSettingsInputCheckedStatus(FILTER_VERIFIED_VIDEOS_KEY, store.hideVerifiedVideos)
        this._uiGen.setSettingsInputCheckedStatus(LINK_DISABLE_PLAYLIST_CONTROLS_KEY, store.linkDisablePlaylistControls)
        this._uiGen.setSettingsInputCheckedStatus(LINK_USER_PUBLIC_VIDEOS_KEY, store.linkUserPublicVideos)
        this._uiGen.setSettingsInputCheckedStatus(OPTION_ALWAYS_SHOW_UI, store.showUIAlways)
        this._uiGen.setSettingsInputCheckedStatus(OPTION_DISABLE_VIDEO_FILTERS, store.disableVideoFilters)
        this._uiGen.setSettingsInputCheckedStatus(UI_REMOVE_IFRAMES, store.removeIFrames)
        this._uiGen.setSettingsInputCheckedStatus(UI_REMOVE_LIVE_MODELS_SECTIONS, store.removeLiveModelsSections)
        this._uiGen.setSettingsInputCheckedStatus(UI_REMOVE_PORN_STAR_SECTIONS, store.removePornStarSections)

        this._uiGen.setSettingsInputValue(FILTER_BLACKLIST_KEY, store.blacklist.join(','))
        this._uiGen.setSettingsInputValue(OPTION_SANITIZATION_KEY, this._transformSanitizationRulesToText(store.sanitize))

        this._uiGen.setSettingsRangeInputValue(FILTER_VIDEO_DURATION_KEY, store.duration.minimum, store.duration.maximum)
        this._uiGen.setSettingsRangeInputValue(FILTER_RATING_VIDEOS_KEY, store.rating.minimum, store.rating.maximum)
        this._uiGen.setSettingsRangeInputValue(FILTER_VIDEO_VIEWS_KEY, store.views.minimum, store.views.maximum)
    }

    /**
     * @private
     */
    _onUIApplyClick ()
    {
        this._settings.hideSDVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_HD_VIDEOS_KEY)
        this._settings.hidePaidVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_PAID_VIDEOS_KEY)
        this._settings.hidePremiumVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_PREMIUM_VIDEOS_KEY)
        this._settings.hidePrivateVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_PRIVATE_VIDEOS_KEY)
        this._settings.hideProChannelVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_PRO_CHANNEL_VIDEOS_KEY)
        this._settings.hideRecommendedVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_RECOMMENDED_VIDEOS_KEY)
        this._settings.hideWatchedVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_WATCHED_VIDEOS_KEY)
        this._settings.hideUnratedVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_UNRATED_VIDEOS_KEY)
        this._settings.hideVerifiedVideos = this._uiGen.getSettingsInputCheckedStatus(FILTER_VERIFIED_VIDEOS_KEY)
        this._settings.linkDisablePlaylistControls = this._uiGen.getSettingsInputCheckedStatus(LINK_DISABLE_PLAYLIST_CONTROLS_KEY)
        this._settings.linkUserPublicVideos = this._uiGen.getSettingsInputCheckedStatus(LINK_USER_PUBLIC_VIDEOS_KEY)
        this._settings.disableVideoFilters = this._uiGen.getSettingsInputCheckedStatus(OPTION_DISABLE_VIDEO_FILTERS)
        this._settings.showUIAlways = this._uiGen.getSettingsInputCheckedStatus(OPTION_ALWAYS_SHOW_UI)
        this._settings.removeIFrames = this._uiGen.getSettingsInputCheckedStatus(UI_REMOVE_IFRAMES)
        this._settings.removeLiveModelsSections = this._uiGen.getSettingsInputCheckedStatus(UI_REMOVE_LIVE_MODELS_SECTIONS)
        this._settings.removePornStarSections = this._uiGen.getSettingsInputCheckedStatus(UI_REMOVE_PORN_STAR_SECTIONS)

        this._settings.duration.minimum = this._uiGen.getSettingsRangeInputValue(FILTER_VIDEO_DURATION_KEY, true)
        this._settings.duration.maximum = this._uiGen.getSettingsRangeInputValue(FILTER_VIDEO_DURATION_KEY, false)
        this._settings.rating.minimum = this._uiGen.getSettingsRangeInputValue(FILTER_RATING_VIDEOS_KEY, true)
        this._settings.rating.maximum = this._uiGen.getSettingsRangeInputValue(FILTER_RATING_VIDEOS_KEY, false)
        this._settings.views.minimum = this._uiGen.getSettingsRangeInputValue(FILTER_VIDEO_VIEWS_KEY, true)
        this._settings.views.maximum = this._uiGen.getSettingsRangeInputValue(FILTER_VIDEO_VIEWS_KEY, false)

        this._validateAndSetBlacklistedWords(this._uiGen.getSettingsInputValue(FILTER_BLACKLIST_KEY).split(','))
        this._validateAndSetSanitizationRules(this._uiGen.getSettingsInputValue(OPTION_SANITIZATION_KEY).split(/\r?\n/g))
        this._statistics.reset()

        for (let videoList of this._getVideoLists()) {
            this._complyVideoList(videoList)
        }
    }

    _processVideoCompliance (videoItem)
    {
        let videoComplies = true

        if (!this._settings.disableVideoFilters) {
            for (let videoFilter of this._videoFilters) {
                if (!videoFilter(videoItem)) {
                    videoComplies = false
                    break
                }
            }
        }
        videoItem.style.display = videoComplies ? 'inline-block' : 'none'
    }

    /**
     * Removes any IFrames being displayed by going over the page repeatedly till none exist
     * @private
     */
    _removeIframes ()
    {
        let removeMilkTruckIframes = () => {
            let iframes = document.getElementsByTagName('milktruck')
            for (let iframe of iframes) {
                iframe.remove()
            }
            return iframes.length
        }

        if (this._settings.removeIFrames) {
            Validator.iFramesRemover()
            let iframesCount
            do {
                iframesCount = removeMilkTruckIframes()
            } while (iframesCount)
        }
    }

    /**
     * @private
     */
    _removeLiveModelsSections ()
    {
        if (this._settings.removeLiveModelsSections) {
            for (let section of document.querySelectorAll('.streamateContent')) {
                section.closest('.sectionWrapper').remove()
            }
        }
    }

    /**
     * @private
     */
    _removePornStarSectionsFromSearchPage ()
    {
        if (this._settings.removePornStarSections) {
            let section = document.querySelector('#relatedPornstarSidebar')
            if (section) {
                section.remove()
            }
        }
    }

    /**
     * Removes premium video sections from profiles
     * @private
     */
    _removeVideoSectionsOnProfilePage ()
    {
        const videoSections = [
            {setting: this._settings.hidePaidVideos, linkSuffix: FILTER_PAID_VIDEOS_KEY},
            {setting: this._settings.hidePremiumVideos, linkSuffix: 'fanonly'},
            {setting: this._settings.hidePrivateVideos, linkSuffix: FILTER_PRIVATE_VIDEOS_KEY},
        ]
        for (let videoSection of videoSections) {
            let videoSectionLink = document.querySelector('.videoSection > div > div > h2 > a[href$="/' + videoSection.linkSuffix + '"]')
            if (videoSectionLink !== null) {
                videoSectionLink.closest('.videoSection').style.display = videoSection.setting ? 'none' : 'block'
            }
        }
    }

    /**
     * @param {Object} sanitizationRules
     * @return {string}
     * @private
     */
    _transformSanitizationRulesToText (sanitizationRules)
    {
        let sanitizationRulesText = []
        for (let substitute in sanitizationRules) {
            sanitizationRulesText.push(substitute + '=' + sanitizationRules[substitute].join(','))
        }
        return sanitizationRulesText.join('\n')
    }

    /**
     * @param {string[]} strings
     * @private
     */
    _trimAndKeepNonEmptyStrings (strings)
    {
        let nonEmptyStrings = []
        for (let string of strings) {
            string = string.trim()
            if (string !== '') {
                nonEmptyStrings.push(string)
            }
        }
        return nonEmptyStrings
    }

    /**
     * @param {string[]} blacklistedWords
     * @private
     */
    _validateAndSetBlacklistedWords (blacklistedWords)
    {
        this._settings.blacklist = this._trimAndKeepNonEmptyStrings(blacklistedWords)
        this._validator.setBlacklist(this._settings.blacklist)
    }

    /**
     * @param {string[]} sanitizationRules
     * @private
     */
    _validateAndSetSanitizationRules (sanitizationRules)
    {
        let fragments, validatedTargetWords
        this._settings.sanitize = {}

        for (let sanitizationRule of sanitizationRules) {
            if (sanitizationRule.includes('=')) {

                fragments = sanitizationRule.split('=')
                if (fragments[0] === '') {
                    fragments[0] = ' '
                }

                validatedTargetWords = this._trimAndKeepNonEmptyStrings(fragments[1].split(','))
                if (validatedTargetWords.length) {
                    this._settings.sanitize[fragments[0]] = validatedTargetWords
                }
            }
        }
        this._validator.setSanitizationRules(this._settings.sanitize)
    }

    /**
     * Validates video duration
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateDuration (videoItem)
    {
        if (this._settings.duration.minimum > 0 || this._settings.duration.maximum > 0) {

            let durationNode = videoItem.querySelector('.duration')
            if (durationNode !== null) {
                let duration = durationNode.textContent.split(':')
                duration = (parseInt(duration[0]) * 60) + parseInt(duration[1])

                return this._validator.validateRange(FILTER_VIDEO_DURATION_KEY, duration, [this._settings.duration.minimum, this._settings.duration.maximum])
            }
        }
        return true
    }

    /**
     * Validate video quality
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateHD (videoItem)
    {
        return this._settings.hideSDVideos ? this._validator.validateNodeExistence(FILTER_HD_VIDEOS_KEY, videoItem, '.hd-thumbnail') : true
    }

    /**
     * Validate paid video status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validatePaidVideo (videoItem)
    {
        return this._settings.hidePaidVideos ? this._validator.validateNodeNonExistence(FILTER_PAID_VIDEOS_KEY, videoItem, '.p2v-icon, .fanClubVideoWrapper') : true
    }

    /**
     * Validate and change playlist video links
     * @param {Node|HTMLElement} videoItem
     * @private
     */
    _validatePlaylistVideoLink (videoItem)
    {
        if (this._settings.linkDisablePlaylistControls) {
            let playlistLinks = videoItem.querySelectorAll('a.linkVideoThumb, span.title a')
            for (let playlistLink of playlistLinks) {
                playlistLink.setAttribute('href', playlistLink.getAttribute('href').replace(/&pkey.*/, ''))
            }
        }
    }

    /**
     * Validate premium video status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validatePremiumVideo (videoItem)
    {
        return this._settings.hidePremiumVideos ? this._validator.validateNodeNonExistence(FILTER_PREMIUM_VIDEOS_KEY, videoItem, '.premiumIcon') : true
    }

    /**
     * Validate private video status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validatePrivateVideo (videoItem)
    {
        return this._settings.hidePrivateVideos ? this._validator.validateNodeNonExistence(FILTER_PRIVATE_VIDEOS_KEY, videoItem, '.privateOverlay') : true
    }

    /**
     * Validate whether video is provided by a professional porn channel
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateProfessionalChannelVideo (videoItem)
    {
        return this._settings.hideProChannelVideos ? this._validator.validateNodeNonExistence(FILTER_PRO_CHANNEL_VIDEOS_KEY, videoItem, '.channel-icon') : true
    }

    /**
     * Validate video rating
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateRating (videoItem)
    {
        let validationCheck = true

        if (this._settings.rating.minimum > 0 || this._settings.rating.maximum > 0) {

            let rating = videoItem.querySelector('.value')
            let isUnratedVideo = false

            if (rating === null) {
                isUnratedVideo = true
            } else {
                rating = parseInt(rating.textContent.replace('%', ''))
                if (rating === 0) {
                    isUnratedVideo = true
                } else {
                    validationCheck = this._validator.validateRange(FILTER_RATING_VIDEOS_KEY, rating, [this._settings.rating.minimum, this._settings.rating.maximum])
                }
            }
            if (isUnratedVideo && this._settings.hideUnratedVideos) {
                validationCheck = false
                this._statistics.record(FILTER_UNRATED_VIDEOS_KEY, validationCheck)
            }
        }
        return validationCheck
    }

    /**
     * Validate recommended video status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateRecommendedState (videoItem)
    {
        return this._settings.hideRecommendedVideos ? this._validator.validateNodeNonExistence(FILTER_RECOMMENDED_VIDEOS_KEY, videoItem, '.recommendedFor') : true
    }

    /**
     * Validate verified status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateVerifiedState (videoItem)
    {
        return this._settings.hideVerifiedVideos ? this._validator.validateNodeNonExistence(FILTER_VERIFIED_VIDEOS_KEY, videoItem, '.own-video-thumbnail') : true
    }

    /**
     * Validate video view count
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateViews (videoItem)
    {
        if (this._settings.views.minimum > 0 || this._settings.views.maximum > 0) {

            let viewsCountString = videoItem.querySelector('.views').textContent.replace(' views', '')
            let viewsCountMultiplier = 1
            let viewsCountStringLength = viewsCountString.length

            if (viewsCountString[viewsCountStringLength - 1] === 'K') {
                viewsCountMultiplier = 1000
                viewsCountString = viewsCountString.replace('K', '')
            } else {
                if (viewsCountString[viewsCountStringLength - 1] === 'M') {
                    viewsCountMultiplier = 1000000
                    viewsCountString = viewsCountString.replace('M', '')
                }
            }
            let viewsCount = parseFloat(viewsCountString) * viewsCountMultiplier

            return this._validator.validateRange(FILTER_VIDEO_VIEWS_KEY, viewsCount, [this._settings.views.minimum, this._settings.views.maximum])
        }
        return true
    }

    /**
     * Validate watched video status
     * @param {Node|HTMLElement} videoItem
     * @return {boolean}
     * @private
     */
    _validateWatchStatus (videoItem)
    {
        return this._settings.hideWatchedVideos ? this._validator.validateNodeNonExistence(FILTER_WATCHED_VIDEOS_KEY, videoItem, '.watchedVideoText') : true
    }

    /**
     * Initialize the script and do basic UI removals
     */
    init ()
    {
        this._removeIframes()

        if (IS_PROFILE_PAGE) {
            this._removeVideoSectionsOnProfilePage()
        }
        if (IS_VIDEO_PAGE) {
            this._complyPaidVideosSectionOnVideoPage()
            this._complyRecommendedVideosListOnVideoPage()
            this._validator.sanitizeVideoPage('.inlineFree')
        }
        if (IS_VIDEO_SEARCH_PAGE) {
            this._removePornStarSectionsFromSearchPage()
            this._fixLeftOverSpaceOnVideoSearchPage()
            this._fixPaginationNavOnVideoSearchPage()
        }

        this._removeLiveModelsSections()
        this._buildUI()
        this._complyProfileLinks()

        for (let videoList of this._getVideoLists()) {
            ChildObserver.create().onNodesAdded((videoItemsAdded) => this._complyVideoList(videoItemsAdded)).observe(videoList)
            this._complyVideoList(videoList)
        }
        this._uiGen.updateStatus('Initial run completed.')

        this._settingsStore.onChange(() => this._onSettingsStoreUpdate())
    }
}

PHSearchAndUITweaks.initialize()