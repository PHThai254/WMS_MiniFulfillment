using Microsoft.Extensions.DependencyInjection;
using WMS.Application.Interfaces;
using WMS.Application.Services;

namespace WMS.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // Auth service stays in Application layer (uses IUserRepository interface)
            services.AddScoped<IAuthService, AuthService>();
            return services;
        }
    }
}
