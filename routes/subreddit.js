"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
class SubredditRoute {
    // Constructor where we initialize the router and set up the routes
    constructor() {
        this.router = express_1.default.Router();
        this.initializeRoutes();
    }
    // Method to set up the routes
    initializeRoutes() {
        // Route to search subreddits by name using the Reddit API
        // :name is a path parameter representing the subreddit name to search for
        this.router.get('/searchSubreddits/:name', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const subreddit = req.params.name;
            try {
                // Get request to Reddit API with subreddit name in query
                const response = yield axios_1.default.get(`https://www.reddit.com/subreddits/search.json?q=${subreddit}&limit=100`);
                // Send the data received from the Reddit API as JSON
                res.json(response.data);
            }
            catch (error) {
                // Log any errors and send a 500 Internal Server Error status code
                console.error('Error searching subreddits:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Route to search for posts in a specific subreddit using the Reddit API
        // :subreddit is a path parameter for the subreddit to search in
        // :searchType is a path parameter for the type of search (e.g., new, hot)
        this.router.get('/searchAuthorSubredditPosts/:subreddit/:searchType', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { subreddit, searchType } = req.params;
            try {
                // Get request to Reddit API with subreddit and search type in the path
                const response = yield axios_1.default.get(`https://www.reddit.com/r/${subreddit}/${searchType}.json?limit=50`);
                // Create an array of Post objects with title and author fields
                const posts = response.data.data.children.map((child) => ({
                    title: child.data.title,
                    author: child.data.author,
                }));
                // Create an array of authors from the posts array
                const authors = posts.map((post) => post.author);
                // Send the authors array as JSON
                res.json(authors);
            }
            catch (error) {
                // Log any errors and send a 500 Internal Server Error status code
                console.error('Error searching subreddit posts:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // Route to get all the unique subreddits where a specific user has posted using the Reddit API
        // :username is a path parameter representing the username of the user
        this.router.get('/searchSubredditsByUser/:username', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const username = req.params.username;
            try {
                // Get request to Reddit API with username in the path to get their submitted posts
                const response = yield axios_1.default.get(`https://www.reddit.com/user/${username}/submitted.json`);
                // Create an array of subreddit names from the response data
                const subRedditNames = response.data.data.children.map((x) => x.data.subreddit);
                // Create a Set to store unique subreddit names (Set only stores unique values)
                const uniqueSubRedditsSet = new Set(subRedditNames);
                // Convert the Set back to an array
                const subReddits = Array.from(uniqueSubRedditsSet);
                // Send the unique subreddit names as JSON
                res.json(subReddits);
            }
            catch (error) {
                // Log any errors and send a 500 Internal Server Error status code
                console.error('Error searching subreddits by user:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // New route to get recommended subreddits
        this.router.get('/getRecommendedSubReddits/:subReddit', (req, res) => __awaiter(this, void 0, void 0, function* () {
            const subReddit = req.params.subReddit;
            try {
                // Step 1: Get top authors for the subreddit
                const topAuthorsRes = yield axios_1.default.get(`https://www.reddit.com/r/${subReddit}/hot.json?limit=50`);
                const topAuthors = topAuthorsRes.data.data.children.map((child) => child.data.author);
                // Step 2: Get subreddit lists for each top author
                const subRedditMatrix = yield Promise.all(topAuthors.map((author) => axios_1.default.get(`https://www.reddit.com/user/${author}/submitted.json`).then(res => res.data.data.children.map((x) => x.data.subreddit))));
                // Step 3: Calculate occurrences and author overlap
                const subRedditOccurrencesMap = {};
                subRedditMatrix.forEach((list, authorIndex) => {
                    let uniqueSubredditsForAuthor = new Set();
                    list.forEach((str) => {
                        if (str.toLowerCase() !== subReddit.toLowerCase() && !uniqueSubredditsForAuthor.has(str)) {
                            if (!subRedditOccurrencesMap[str]) {
                                subRedditOccurrencesMap[str] = { count: 1, authorOverlap: 1 };
                            }
                            else {
                                subRedditOccurrencesMap[str].count += 1;
                                subRedditOccurrencesMap[str].authorOverlap += 1;
                            }
                            uniqueSubredditsForAuthor.add(str);
                        }
                    });
                });
                const totalAuthors = topAuthors.length;
                Object.values(subRedditOccurrencesMap).forEach(value => {
                    value.authorOverlap = (value.authorOverlap / totalAuthors) * 100;
                });
                const orderedSubRedditOccurrences = Object.entries(subRedditOccurrencesMap).sort((a, b) => b[1].count - a[1].count).map(([subreddit, data]) => ({ subreddit, occurrence: data.count, authorOverlap: data.authorOverlap }));
                res.json(orderedSubRedditOccurrences);
            }
            catch (error) {
                console.error('Error getting recommended subreddits:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }));
    }
}
// Export a new instance of SubredditRoute, with the router property holding the configured Router instance
exports.default = new SubredditRoute().router;
