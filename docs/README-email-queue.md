# Email Queue System

This document describes the email queue system implemented for the Tag You Write application.

## Overview

The email queue system allows emails to be queued in production environments while maintaining immediate sending in local development. This improves performance and reliability by:

- Reducing response times in production
- Providing retry mechanisms for failed emails
- Allowing for better monitoring and debugging
- Supporting high-volume email sending

## Architecture

### Components

1. **EmailQueue Model** (`model/EmailQueue.php`)
   - Manages email queue database operations
   - Provides methods for inserting, updating, and querying queued emails

2. **EmailQueueProcessor** (`services/EmailQueueProcessor.php`)
   - Processes pending emails from the queue
   - Handles retry logic and failure management
   - Designed to be lean and efficient for cron execution

3. **Enhanced Email Library** (`library/Email.php`)
   - Supports both immediate sending and queuing
   - New `sendWithKeys()` method for better translation support
   - Environment-aware queuing decisions

4. **Cron Script** (`cron/process_email_queue.php`)
   - Standalone script for processing the email queue
   - Can be called manually or via cron

### Database Schema

The `email_queue` table stores:

- `id`: Primary key
- `recipient_email`: Email address
- `recipient_name`: Recipient name
- `subject`: Email subject (translation key)
- `subject_params`: JSON parameters for subject translation
- `message_key`: Translation key for message content
- `message_params`: JSON parameters for message translation
- `status`: 'pending', 'sent', or 'failed'
- `attempts`: Number of sending attempts
- `max_attempts`: Maximum retry attempts (default: 3)
- `sent_at`: Timestamp when email was sent
- `created_at`: When email was queued
- `updated_at`: Last update timestamp

## Usage

### For Developers

#### Sending Emails

Use the new `sendWithKeys()` method for better queuing support:

```php
$email = new Email();

// Queue or send immediately based on environment
$email->sendWithKeys(
    'user@example.com',           // recipient email
    'John Doe',                   // recipient name
    'email.welcome.subject',       // subject translation key
    'email.welcome.message',       // message translation key
    [],                           // subject parameters
    ['name' => 'John']           // message parameters
);
```

#### Environment Configuration

Add to your `.env` file:

```env
# Enable email queuing (true for production, false for local)
EMAIL_QUEUE_ENABLED=true

# Or use APP_ENV for automatic detection
APP_ENV=production
```

### For System Administrators

#### Setting Up Cron

Add this to your crontab to process emails every minute:

```bash
* * * * * /usr/bin/php /path/to/your/project/cron/process_email_queue.php >> /path/to/your/project/logs/email_queue_cron.log 2>&1
```

or without the logging: 

```bash
* * * * * /usr/bin/php /path/to/your/project/cron/process_email_queue.php 2>&1

```



#### Manual Processing

You can also run the processor manually:

```bash
php cron/process_email_queue.php
```

#### Monitoring

Check queue statistics:

```php
$processor = new EmailQueueProcessor();
$stats = $processor->getStats();
print_r($stats);
```

## Migration Guide

### From Old Email System

1. **Update Database**
   ```sql
   -- Run the email queue table creation
   -- (Already included in database-updates.sql)
   ```

2. **Update Controllers**
   - Replace `$emailer->send()` with `$emailer->sendWithKeys()`
   - Move translation parameters to the new method signature

3. **Test Locally**
   - Emails should send immediately in local environment
   - Verify translations work correctly

4. **Deploy to Production**
   - Set `EMAIL_QUEUE_ENABLED=true` in production
   - Set up cron job
   - Monitor email queue processing

### Environment Detection

The system automatically detects the environment:

- **Local Development**: Emails sent immediately
- **Production**: Emails queued for processing

Detection is based on:
1. `EMAIL_QUEUE_ENABLED` environment variable
2. `APP_ENV` environment variable
3. Server name/host indicators

## Troubleshooting

### Common Issues

1. **Emails not being sent**
   - Check if cron is running: `crontab -l`
   - Verify database connection
   - Check email queue status: `SELECT * FROM email_queue WHERE status = 'pending'`

2. **Translation errors**
   - Ensure translation keys exist in language files
   - Verify parameter names match translation placeholders

3. **Performance issues**
   - Adjust `maxEmailsPerRun` in EmailQueueProcessor
   - Monitor processing duration in logs

### Logs

The system logs to:
- PHP error log (default for error_log())
- Custom email error log (`email_error.log`)
- Cron output  (if run via cron, e.g., email_queue_cron.log)

To log directly to your custom log file, use:
error_log('message', 3, ROOT_DIR . '/logs/email_queue_cron.log');

### Database Maintenance

Clean up old emails:

```sql
-- Remove sent emails older than 30 days
DELETE FROM email_queue 
WHERE status = 'sent' 
AND sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Best Practices

1. **Always use `sendWithKeys()`** for new email implementations
2. **Test locally** before deploying to production
3. **Monitor queue statistics** regularly
4. **Set appropriate retry limits** for your use case
5. **Clean up old emails** periodically

## General Clarification

- Make sure to always use absolute paths for any file access in CLI/cron code.
- The queue system relies on translation keys and parameters being stored in the database and resolved at send time, so your translation files must be accessible from any context (web, CLI, cron).

## Future Enhancements

Potential improvements:
- Email templates with HTML support
- Priority queuing
- Email tracking and analytics
- Webhook notifications for failed emails
- Rate limiting per recipient 