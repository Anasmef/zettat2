# Test Wasender - Simple Version

$ApiToken = "6fb0a3f2b3ab2ac2afdd71f8a3c68f8614a515c922f769cf0f7f914a065cb513"

$Students = @(
    @{ name = "DOUAA FARAH"; phone = "212660989228" },
    @{ name = "MALAK ER-REFDY"; phone = "212784352176" },
    @{ name = "RIAD ELOTHMANI"; phone = "212661518763" },
    @{ name = "KHALID SAMI"; phone = "212664373264" },
    @{ name = "HAITAM CHANE"; phone = "212722752435" },
    @{ name = "HAFID ESSEDDIK"; phone = "212668483310" },
    @{ name = "KARAMI WASSIM"; phone = "212642888552" }
)

$Headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

Write-Host "Testing Wasender..." -ForegroundColor Cyan
Write-Host "==================`n" -ForegroundColor Cyan

foreach ($Student in $Students) {
    Write-Host "Student: $($Student.name)" -ForegroundColor Yellow
    Write-Host "Phone: $($Student.phone)" -ForegroundColor Gray
    
    $Body = @{
        "to" = $Student.phone
        "text" = "Test message"
    } | ConvertTo-Json

    try {
        $Response = Invoke-WebRequest `
            -Uri "https://www.wasenderapi.com/api/send-message" `
            -Method POST `
            -Headers $Headers `
            -Body $Body `
            -ContentType "application/json" `
            -ErrorAction Stop

        Write-Host "Result: SUCCESS" -ForegroundColor Green
        $Content = $Response.Content | ConvertFrom-Json
        Write-Host "Message ID: $($Content.messageId)" -ForegroundColor Green
    }
    catch {
        Write-Host "Result: FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.ErrorDetails) {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Start-Sleep -Seconds 2
}

Write-Host "Done!" -ForegroundColor Cyan