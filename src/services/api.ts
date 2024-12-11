// const API_BASE_URL = 'http://localhost:4000';
export const API_BASE_URL = 'https://polyswipe-d56822d3db23.herokuapp.com';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials extends LoginCredentials {
  confirm_password: string;
}

interface LikeDislikePayload {
  clothing_id: number;
}

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      console.log(`Making request to: ${API_BASE_URL}${endpoint}`);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(credentials: RegisterCredentials) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/logout', {
      method: 'POST',
    });
  }

  async checkAuth() {
    return this.request('/check-auth');
  }

  async like(clothingId: string) {
    return this.request('/like', {
      method: 'POST',
      body: JSON.stringify({ 
          clothing_id: parseInt(clothingId, 10)
      }),
    });
  }

  async dislike(clothingId: string) {
    return this.request('/dislike', {
      method: 'POST',
      body: JSON.stringify({ 
        clothing_id: parseInt(clothingId, 10)
    }),
    });
  }

  async getImages() {
    return this.request('/get_images');
  }
}

const apiService = new ApiService();

export const api = {
  login: apiService.login.bind(apiService),
  register: apiService.register.bind(apiService),
  logout: apiService.logout.bind(apiService),
  checkAuth: apiService.checkAuth.bind(apiService),
  like: apiService.like.bind(apiService),
  dislike: apiService.dislike.bind(apiService),
  getImages: apiService.getImages.bind(apiService),
};