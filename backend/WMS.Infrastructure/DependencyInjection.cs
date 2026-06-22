using Microsoft.Extensions.DependencyInjection;

using WMS.Application.Interfaces;
using WMS.Infrastructure.Repositories;
using WMS.Infrastructure.Services;
using WMS.Infrastructure.Services.MasterData;
using WMS.Infrastructure.Services.Management;
using WMS.Infrastructure.Services.Operations;

namespace WMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        // Auth & User Context
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICurrentUserContext, CurrentUserContext>();

        // Master Data Services
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<IZoneService, ZoneService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IProductImageService, ProductImageService>();

        // Operation Services
        services.AddScoped<IReceiptService, ReceiptService>();
        services.AddScoped<IIssueService, IssueService>();
        services.AddScoped<ICompletionCheckService, CompletionCheckService>();

        // Management Services
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IUserManagementService, UserManagementService>();

        // External APIs
        services.AddHttpClient<IAiOcrService, GeminiOcrService>();

        return services;
    }
}
