const fs = require('fs');
const path = require('path');

const filePath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/health/health.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all error handling issues
const fixes = [
  {
    old: `      const allHealthy = Object.values(checks).every(check => 
        Object.values(check)[0].status === 'up'
      );`,
    new: `      const allHealthy = Object.values(checks).every(check => {
        const checkValues = Object.values(check);
        return checkValues.length > 0 && checkValues[0]?.status === 'up';
      });`
  },
  {
    old: `    } catch (error) {
      this.logger.error('Health check failed', error);`,
    new: `    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Health check failed', errorMessage);`
  },
  {
    old: `    } catch (error) {
      this.logger.error('Database health check failed', error);`,
    new: `    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Database health check failed', errorMessage);`
  },
  {
    old: `        error: error.message,`,
    new: `        error: error instanceof Error ? error.message : 'Unknown error',`
  },
  {
    old: `    } catch (error) {
      this.logger.error('Redis health check failed', error);`,
    new: `    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Redis health check failed', errorMessage);`
  },
  {
    old: `    } catch (error) {
      this.logger.error('Basic functionality check failed', error);`,
    new: `    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Basic functionality check failed', errorMessage);`
  }
];

let modified = false;
fixes.forEach(fix => {
  if (content.includes(fix.old)) {
    content = content.replace(fix.old, fix.new);
    modified = true;
    console.log('Applied fix for health service error handling');
  }
});

if (modified) {
  fs.writeFileSync(filePath, content);
  console.log('Health service error handling fixed');
} else {
  console.log('No fixes needed or patterns not found');
}