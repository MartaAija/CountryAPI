import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient, { formatErrorMessage } from '../utils/apiClient';
import { blogApiGet } from '../utils/apiUtils';
import { isAuthenticated } from '../utils/authService';
import '../App.css';

/**
 * Home page component
 * Landing page with information about the API service
 * Also displays recent and popular blog posts
 */
function Home() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    
    // State for blog posts
    const [recentPosts, setRecentPosts] = useState([]);
    const [popularPosts, setPopularPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Check authentication status when component mounts
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const authStatus = await isAuthenticated();
                setIsLoggedIn(authStatus);
            } catch (error) {
                console.error('Error checking authentication:', error);
                setIsLoggedIn(false);
            }
        };
        
        checkAuth();
    }, []);

    // Fetch blog posts when component mounts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                
                // Use the blogApiGet utility that uses apiClient with throttling
                const response = await blogApiGet('/posts', { 
                    params: { page: 1, limit: 5 }
                });
                
                // Set recent posts (already sorted by date)
                setRecentPosts(response.data.posts);
                
                // Create popular posts array by sorting by likes
                const sorted = [...response.data.posts].sort((a, b) => 
                    (b.likes_count || 0) - (a.likes_count || 0)
                );
                setPopularPosts(sorted.slice(0, 3)); // Top 3 most popular
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching posts:', error);
                setError(formatErrorMessage(error));
                setRecentPosts([]);
                setPopularPosts([]);
                setLoading(false);
            }
        };
        
        fetchPosts();
    }, []);

    // View full post handler
    const handleViewPost = (postId) => {
        navigate(`/blog/post/${postId}`);
    };

    return (
        <div className="home-container">
            {/* Hero section with main headline */}
            <section className="hero-section">
                <h1 className="hero-title">TravelTales</h1>
                <p className="hero-subtitle">
                    Share your journey. Connect with travelers from around the world.
                </p>
                <div className="hero-cta">
                    {!isLoggedIn ? (
                        <Link to="/register" className="btn btn-primary">
                            Join TravelTales Today
                        </Link>
                    ) : (
                        <Link to="/blog/create" className="btn btn-primary">
                            Share Your Story
                        </Link>
                    )}
                </div>
            </section>

            {/* Blog posts section */}
            <section className="home-blog-section">
                <h2 className="section-title">Recent Travel Stories</h2>
                
                {loading ? (
                    <div className="loading-spinner">Loading posts...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <div className="home-posts-grid">
                        {recentPosts.length > 0 ? (
                            recentPosts.map(post => (
                                <div key={post.id} className="home-post-card" onClick={() => handleViewPost(post.id)}>
                                    <h3 className="post-title">{post.title}</h3>
                                    <div className="post-meta">
                                        <span className="post-country">📍 {post.country_name}</span>
                                        <span className="post-author">
                                            By {post.first_name} {post.last_name}
                                        </span>
                                        <span className="post-date">
                                            🗓️ Visit: {new Date(post.visit_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="post-excerpt">
                                        {post.content.length > 150 
                                            ? post.content.substring(0, 150) + '...' 
                                            : post.content}
                                    </p>
                                    <div className="post-stats">
                                        <span className="stat likes">👍 {post.likes_count || 0}</span>
                                        <span className="stat comments">💬 {post.comments_count || 0}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-posts-message">
                                <p>No travel stories yet. Be the first to share!</p>
                                {isLoggedIn && (
                                    <Link to="/blog/create" className="share-button">Share Your Story</Link>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="view-all-link">
                    <Link to="/blog">View All Travel Stories</Link>
                </div>
            </section>

            {/* Popular posts section */}
            <section className="home-popular-section">
                <h2 className="section-title">Popular Stories</h2>
                
                {!loading && !error && (
                    <div className="popular-posts-grid">
                        {popularPosts.length > 0 ? (
                            popularPosts.map(post => (
                                <div key={post.id} className="popular-post-card" onClick={() => handleViewPost(post.id)}>
                                    <div className="popular-post-header">
                                        <h3>{post.title}</h3>
                                        <div className="popular-post-likes">❤️ {post.likes_count || 0}</div>
                                    </div>
                                    <div className="post-meta">
                                        <span className="post-country">📍 {post.country_name}</span>
                                        <span className="post-date">
                                            🗓️ Visit: {new Date(post.visit_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="post-author">By {post.first_name} {post.last_name}</div>
                                </div>
                            ))
                        ) : (
                            <div className="no-posts-message">
                                <p>No popular stories yet!</p>
                                {isLoggedIn && (
                                    <Link to="/blog/create" className="share-button">Be the first to share!</Link>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Feature highlights section */}
            <section className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon">📝</div>
                    <h3 className="feature-title">Share Your Journeys</h3>
                    <p className="feature-description">
                        Document and share your travel experiences with a global community
                    </p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">🌍</div>
                    <h3 className="feature-title">Explore Destinations</h3>
                    <p className="feature-description">
                        Discover new places through authentic travel stories from fellow explorers
                    </p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon">👥</div>
                    <h3 className="feature-title">Connect with Travelers</h3>
                    <p className="feature-description">
                        Follow other travelers, comment on their stories, and build your network
                    </p>
                </div>
            </section>

            {/* Call to action - only shown to non-logged in users */}
            {!isLoggedIn && (
                <section className="cta-section">
                    <h2 className="section-title">Join Our Community</h2>
                    <div className="feature-card">
                        <p className="feature-description">
                            Create an account to share your travel experiences and connect with fellow adventurers.
                        </p>
                        <Link to="/register" className="btn btn-primary">
                            Sign Up Now
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}

export default Home;
