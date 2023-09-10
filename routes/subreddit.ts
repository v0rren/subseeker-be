import express, { Request, Response, Router } from 'express';
import axios from 'axios';

// Interface to define the structure of a Post object
interface Post {
  title: string;
  author: string;
}

class SubredditRoute {
  // The router property that will store the Express Router instance
  public router: Router;

  // Constructor where we initialize the router and set up the routes
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  // Method to set up the routes
  private initializeRoutes() {

    // Route to search subreddits by name using the Reddit API
    // :name is a path parameter representing the subreddit name to search for
    this.router.get('/searchSubreddits/:name', async (req: Request, res: Response) => {
      const subreddit = req.params.name;
      try {
        // Get request to Reddit API with subreddit name in query
        const response = await axios.get(`https://www.reddit.com/subreddits/search.json?q=${subreddit}&limit=100`);
        // Send the data received from the Reddit API as JSON
        res.json(response.data);
      } catch (error) {
        // Log any errors and send a 500 Internal Server Error status code
        console.error('Error searching subreddits:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Route to search for posts in a specific subreddit using the Reddit API
    // :subreddit is a path parameter for the subreddit to search in
    // :searchType is a path parameter for the type of search (e.g., new, hot)
    this.router.get('/searchAuthorSubredditPosts/:subreddit/:searchType', async (req: Request, res: Response) => {
      const { subreddit, searchType } = req.params;
      try {
        // Get request to Reddit API with subreddit and search type in the path
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/${searchType}.json?limit=50`);
        // Create an array of Post objects with title and author fields
        const posts: Post[] = response.data.data.children.map((child: any) => ({
          title: child.data.title,
          author: child.data.author,
        }));
        // Create an array of authors from the posts array
        const authors = posts.map((post) => post.author);
        // Send the authors array as JSON
        res.json(authors);
      } catch (error) {
        // Log any errors and send a 500 Internal Server Error status code
        console.error('Error searching subreddit posts:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Route to get all the unique subreddits where a specific user has posted using the Reddit API
    // :username is a path parameter representing the username of the user
    this.router.get('/searchSubredditsByUser/:username', async (req: Request, res: Response) => {
      const username = req.params.username;
      try {
        // Get request to Reddit API with username in the path to get their submitted posts
        const response = await axios.get(`https://www.reddit.com/user/${username}/submitted.json`);
        // Create an array of subreddit names from the response data
        const subRedditNames: string[] = response.data.data.children.map((x: any) => x.data.subreddit);
        // Create a Set to store unique subreddit names (Set only stores unique values)
        const uniqueSubRedditsSet: Set<string> = new Set(subRedditNames);
        // Convert the Set back to an array
        const subReddits: string[] = Array.from(uniqueSubRedditsSet);
        // Send the unique subreddit names as JSON
        res.json(subReddits);
      } catch (error) {
        // Log any errors and send a 500 Internal Server Error status code
        console.error('Error searching subreddits by user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    // New route to get recommended subreddits
    this.router.get('/getRecommendedSubReddits/:subReddit', async (req: Request, res: Response) => {
      const subReddit = req.params.subReddit;

      try {
        // Step 1: Get top authors for the subreddit
        const topAuthorsRes = await axios.get(`https://www.reddit.com/r/${subReddit}/hot.json?limit=50`);
        const topAuthors: string[] = topAuthorsRes.data.data.children.map((child: any) => child.data.author);

        // Step 2: Get subreddit lists for each top author
        const subRedditMatrix = await Promise.all(
            topAuthors.map((author) => axios.get(`https://www.reddit.com/user/${author}/submitted.json`).then(res => res.data.data.children.map((x: any) => x.data.subreddit)))
        );

        // Step 3: Calculate occurrences and author overlap
        const subRedditOccurrencesMap: { [key: string]: { count: number, authorOverlap: number } } = {};
        subRedditMatrix.forEach((list, authorIndex) => {
          let uniqueSubredditsForAuthor = new Set<string>();

          list.forEach((str: string) => {
            if(str.toLowerCase() !== subReddit.toLowerCase() && !uniqueSubredditsForAuthor.has(str)) {
              if (!subRedditOccurrencesMap[str]) {
                subRedditOccurrencesMap[str] = { count: 1, authorOverlap: 1 };
              } else {
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

        const orderedSubRedditOccurrences = Object.entries(subRedditOccurrencesMap).sort(
            (a, b) => b[1].count - a[1].count
        ).map(([subreddit, data]) => ({ subreddit, occurrence: data.count, authorOverlap: data.authorOverlap }));

        res.json(orderedSubRedditOccurrences);

      } catch (error) {
        console.error('Error getting recommended subreddits:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }
}


// Export a new instance of SubredditRoute, with the router property holding the configured Router instance
export default new SubredditRoute().router;
