import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import apiClient, { formatErrorMessage } from '../../utils/apiClient';
import { getBlogApiUrl, blogApiPut } from '../../utils/apiUtils';
import '../../App.css';

function BlogForm() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    country_name: '',
    visit_date: new Date().toISOString().split('T')[0] 
  });
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchPostData = useCallback(async () => {
    try {
      const { url } = getBlogApiUrl(`/posts/${id}`);
      const response = await apiClient.get(url);
      const { title, content, country_name } = response.data;
      
      setFormData({
        title,
        content,
        country_name,
        visit_date: response.data.visit_date.split('T')[0]
      });
      setLoading(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Blog post not found');
      } else {
        setError('Failed to fetch blog post data');
      }
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Fetch countries for dropdown
    const fetchCountries = async () => {
      try {
        // Use the public endpoint instead of the protected one
        const response = await apiClient.get('/countries');
        if (response.data && Array.isArray(response.data)) {
          setCountries(response.data);
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError('Failed to load countries. Please try again later.');
      }
    };

    fetchCountries();
        
    // If edit mode, fetch the post data
    if (isEditMode) {
      fetchPostData();
    } else {
      setLoading(false);
    }
  }, [isEditMode, navigate, location.pathname, fetchPostData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    // Validate form
    if (!formData.title.trim() || !formData.content.trim() || !formData.country_name || !formData.visit_date) {
      setError('Please fill in all required fields');
      setSubmitLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to create a blog post');
        setSubmitLoading(false);
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        country_name: formData.country_name,
        visit_date: formData.visit_date
      };

      if (isEditMode) {
        // Use the blogApiPut utility function instead of direct apiClient call
        await blogApiPut(`/posts/${id}`, postData, { headers });
        setSuccess('Post updated successfully!');
      } else {
        // For new posts
        await apiClient.post('/blog/posts', postData, { headers });
        setSuccess('Post created successfully!');
      }
      
      setTimeout(() => {
      navigate('/blog');
      }, 1500);
    } catch (error) {
      console.error('Error submitting blog post:', error);
      const errorMsg = formatErrorMessage(error);
      setError(errorMsg);
      setSubmitLoading(false);
    }
  };

  // Helper function to find the selected country
  const getSelectedCountry = () => {
    return countries.find(c => c.name === formData.country_name) || null;
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="page-container">
      <div className="form-container blog-form">
        <h2>{isEditMode ? 'Edit Your Travel Story' : 'Share Your Travel Story'}</h2>
        
        {error && <div className="message error-message">{error}</div>}
        {success && <div className="message success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Give your travel story a compelling title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="country_name">Country</label>
            <select
              id="country_name"
              name="country_name"
              value={formData.country_name}
              onChange={handleChange}
              required
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country.name} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
            
            {/* Display country info right after country select field */}
            {formData.country_name && getSelectedCountry() && (
              <div className="country-info-display">
                {getSelectedCountry().flag && (
                  <img 
                    src={getSelectedCountry().flag} 
                    alt={`Flag of ${formData.country_name}`}
                    className="country-flag-preview"
                  />
                )}
                <div className="country-info-item">
                  <strong>Capital:</strong> <span>{getSelectedCountry().capital || 'N/A'}</span>
                </div>
                <div className="country-info-item">
                  <strong>Currency:</strong> 
                  <span>{
                    getSelectedCountry().currency
                      ? `${getSelectedCountry().currency.name} (${getSelectedCountry().currency.symbol})`
                      : 'N/A'
                  }</span>
                </div>
                <div className="country-info-item">
                  <strong>Languages:</strong> 
                  <span>{
                    getSelectedCountry().languages?.length > 0
                      ? getSelectedCountry().languages.join(', ')
                      : 'N/A'
                  }</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="visit_date">Visit Date</label>
            <input
              type="date"
              id="visit_date"
              name="visit_date"
              value={formData.visit_date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Your Travel Story</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="10"
              placeholder="Share your experiences, tips, and memorable moments..."
              required
            ></textarea>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => navigate('/blog')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={submitLoading}
            >
              {submitLoading 
                ? 'Saving...' 
                : isEditMode ? 'Update Story' : 'Share Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlogForm;
