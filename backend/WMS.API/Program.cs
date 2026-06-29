using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WMS.API.Authorization;
using WMS.API.Middlewares;
using WMS.Application;
using WMS.Infrastructure;
using WMS.Infrastructure.Data;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
Console.WriteLine("===== DEBUG CONFIG =====");
Console.WriteLine($"Environment = {builder.Environment.EnvironmentName}");
Console.WriteLine($"ContentRoot = {builder.Environment.ContentRootPath}");
Console.WriteLine($"Jwt:Key = '{builder.Configuration["Jwt:Key"]}'");
Console.WriteLine($"Jwt:Issuer = '{builder.Configuration["Jwt:Issuer"]}'");
Console.WriteLine("========================");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Add HttpContextAccessor for accessing current user information (JWT Token claims)
builder.Services.AddHttpContextAccessor();

// Swagger/OpenAPI with JWT Authentication
builder.Services.AddSwaggerGen(options =>
{
    // Thông tin cơ bản của API
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WMS Mini Fulfillment API",
        Version = "v1",
        Description = "API cho hệ thống quản lý kho bãi"
    });

    // THÊM JWT SECURITY SCHEME (tạo nút "Authorize" trên Swagger UI)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Description = "Nhập JWT Token vào đây. Ví dụ: eyJhbGc..."
    });

    // 📌 THÊM SECURITY REQUIREMENT (tự động đính kèm token vào header)
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices();

// Authentication (JWT Token validation)
var jwtSecret = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException("Jwt:Key không được cấu hình trong appsettings.json");

builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

// ── Authorization: Policy-based RBAC động ──────────────────────────────────
// Đăng ký PermissionHandler để tra cứu DB
builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();

// Tạo Policy cho từng Permission trong hệ thống
// Mỗi Policy map 1-1 với tên Permission trong bảng Permissions
var allPermissions = new[]
{
    // Receipt
    "create_receipt", "view_receipt", "approve_qc_receipt",
    "approve_ocr_receipt", "complete_putaway", "save_from_ocr", "run_ocr",
    "approve_qc", // Policy dùng cho luồng QA/QC duyệt và lưu kết quả OCR
    // Issue
    "create_issue", "view_issue", "get_picking_plan", "confirm_pick", "handover_issue",
    // Inventory
    "view_inventory", "adjust_inventory", "view_transactions", "view_stock_summary",
    // Master Data
    "manage_warehouses", "manage_zones", "manage_products",
    "manage_categories", "manage_suppliers", "manage_customers",
    // User Management
    "manage_users",
    // Analytics
    "view_analytics",
    // FIX BUG 2: Alias policy cho Dashboard KPI - QA_QC được gán quyền này trong DB
    // Thay thế hardcode [Authorize(Roles="Admin")] bằng policy-based RBAC động
    "view_dashboard_kpi",
};

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in allPermissions)
    {
        options.AddPolicy(permission, policy =>
            policy.Requirements.Add(new PermissionRequirement(permission)));
    }
});

// CORS (nếu cần cho Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Khởi tạo DB và Seed Data tự động
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
    // 1. Tự động chạy Migration: Đảm bảo DB và các bảng được tạo/cập nhật mới nhất
    await dbContext.Database.MigrateAsync(); 
    
    // 2. Sau khi chắc chắn cấu trúc DB đã an toàn, mới bắt đầu bơm dữ liệu nền
    await DbInitializer.SeedAsync(dbContext);
}

// 1. Global Exception Middleware (PHẢI ở đầu)
app.UseMiddleware<GlobalExceptionMiddleware>();

// 2. Redirect HTTP → HTTPS
app.UseHttpsRedirection();

// 3. Static Files (Serve uploaded images)
app.UseStaticFiles();

// 4. CORS (nếu cần)
app.UseCors("AllowAll");

// 5. Swagger UI (chỉ trong Development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "WMS API v1");
        options.RoutePrefix = string.Empty; // Truy cập Swagger tại root: http://localhost:5000/
    });
}

// 6. Routing
app.UseRouting();

// 7. Authentication (xác thực token)
app.UseAuthentication();

// 8. Authorization (phân quyền)
app.UseAuthorization();

// 9. Map Controllers
app.MapControllers();

app.Run();