import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Simplified Apollo client for REST-like GraphQL queries
const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_SUPABASE_URL}/graphql/v1`,
  headers: {
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ",
  }
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        fields: {
          media_urls: {
            merge: false, // Replace rather than merge arrays
          },
        },
      },
      Query: {
        fields: {
          products: {
            keyArgs: ['filters'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// GraphQL queries and mutations
export const PRODUCT_FEED_QUERY = `
  query GetProductFeed($limit: Int!, $offset: Int!, $filters: ProductFilters) {
    products(limit: $limit, offset: $offset, filters: $filters) {
      id
      title
      description
      price_cents
      currency
      category_slug
      attributes
      media_urls
      ar_mesh_url
      brand {
        id
        name
        logo_url
      }
      retailer {
        id
        name
        logo_url
      }
    }
  }
`;

export const VISUAL_SEARCH_QUERY = `
  query VisualSearch($image: String!, $limit: Int = 20) {
    visualSearch(image: $image, limit: $limit) {
      id
      title
      price_cents
      currency
      media_urls
      similarity_score
      brand {
        name
      }
    }
  }
`;

export const PERSONALIZED_RECOMMENDATIONS = `
  query PersonalizedRecommendations($userId: String!, $limit: Int = 10) {
    personalizedRecommendations(userId: $userId, limit: $limit) {
      id
      title
      price_cents
      currency
      media_urls
      confidence_score
      reason
      brand {
        name
      }
    }
  }
`;

export const TRACK_EVENT_MUTATION = `
  mutation TrackEvent($event: EventInput!) {
    trackEvent(event: $event) {
      success
    }
  }
`;

export const REAL_TIME_ANALYTICS_SUBSCRIPTION = `
  subscription RealTimeAnalytics($userId: String!) {
    analyticsUpdates(userId: $userId) {
      metric
      value
      timestamp
    }
  }
`;