using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WMS.Infrastructure.Data;
using WMS.Infrastructure;
using WMS.API.Middlewares;
using WMS.Application;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

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

// Authorization
builder.Services.AddAuthorization();

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